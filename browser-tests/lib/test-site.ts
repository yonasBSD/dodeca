/**
 * Test site management for Playwright browser tests.
 *
 * Spawns a ddc server process and provides utilities for:
 * - Starting/stopping the server
 * - Modifying fixture files to trigger livereload
 * - Getting the server URL
 */

import { spawn, ChildProcess } from "child_process";
import { promises as fs, accessSync, constants as fsConstants } from "fs";
import * as path from "path";
import * as os from "os";
import * as net from "net";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestSiteOptions {
  /** Name of fixture in crates/integration-tests/fixtures/ */
  fixture: string;
  /** Additional environment variables */
  env?: Record<string, string>;
}

export class TestSite {
  private process: ChildProcess | null = null;
  private tempDir: string | null = null;
  private _port: number | null = null;
  private _fixtureDir: string | null = null;
  private ready: Promise<void> | null = null;

  constructor(private options: TestSiteOptions) {}

  /** Get the server URL (e.g., http://127.0.0.1:3000) */
  get url(): string {
    if (!this._port) {
      throw new Error("Server not started");
    }
    return `http://127.0.0.1:${this._port}`;
  }

  /** Get the port number */
  get port(): number {
    if (!this._port) {
      throw new Error("Server not started");
    }
    return this._port;
  }

  /** Get the fixture directory path */
  get fixtureDir(): string {
    if (!this._fixtureDir) {
      throw new Error("Server not started");
    }
    return this._fixtureDir;
  }

  /** Find the ddc binary */
  private findDdcBinary(): string {
    // Check environment variable first
    const envBin = process.env.DODECA_BIN;
    if (envBin) {
      return envBin;
    }

    // Try common locations relative to project root
    const projectRoot = path.resolve(__dirname, "../..");
    const candidates = [
      path.join(projectRoot, "target/release/ddc"),
      path.join(projectRoot, "target/debug/ddc"),
    ];

    for (const candidate of candidates) {
      try {
        // Check if file exists synchronously (we're in constructor-adjacent code)
        accessSync(candidate, fsConstants.X_OK);
        return candidate;
      } catch {
        // Continue to next candidate
      }
    }

    throw new Error(
      "Could not find ddc binary. Set DODECA_BIN environment variable or build with `cargo build`"
    );
  }

  /** Find an available port */
  private async findPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          const port = addr.port;
          server.close(() => resolve(port));
        } else {
          reject(new Error("Could not get server address"));
        }
      });
      server.on("error", reject);
    });
  }

  /** Copy a directory recursively */
  private async copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /** Start the test server */
  async start(): Promise<void> {
    // Find ddc binary
    const ddcBin = this.findDdcBinary();

    // Find available port
    this._port = await this.findPort();

    // Create temp directory
    this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dodeca-browser-test-"));

    // Copy fixture to temp directory
    const projectRoot = path.resolve(__dirname, "../..");
    const fixtureSrc = path.join(
      projectRoot,
      "crates/integration-tests/fixtures",
      this.options.fixture
    );
    this._fixtureDir = this.tempDir;
    await this.copyDir(fixtureSrc, this._fixtureDir);

    // Create .cache directory
    await fs.mkdir(path.join(this._fixtureDir, ".cache"), { recursive: true });

    // Start ddc serve
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      RUST_LOG: "debug,ureq=warn,hyper=warn,h2=warn",
      RUST_BACKTRACE: "1",
      ...this.options.env,
    };

    // Set DODECA_CELL_PATH if not already set
    if (!env.DODECA_CELL_PATH) {
      const cellPath = path.dirname(ddcBin);
      env.DODECA_CELL_PATH = cellPath;
    }

    this.process = spawn(
      ddcBin,
      ["serve", this._fixtureDir, "--no-tui", "--port", String(this._port)],
      {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    // Collect output for debugging
    let stdout = "";
    let stderr = "";

    this.process.stdout?.on("data", (data) => {
      stdout += data.toString();
      if (process.env.DEBUG) {
        process.stdout.write(`[ddc stdout] ${data}`);
      }
    });

    this.process.stderr?.on("data", (data) => {
      stderr += data.toString();
      if (process.env.DEBUG) {
        process.stderr.write(`[ddc stderr] ${data}`);
      }
    });

    // Wait for server to be ready
    this.ready = this.waitForReady();
    await this.ready;
  }

  /** Wait for the server to respond */
  private async waitForReady(timeoutMs = 30000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        const response = await fetch(`${this.url}/`);
        if (response.ok) {
          return;
        }
      } catch {
        // Server not ready yet
      }

      // Check if process died
      if (this.process?.exitCode !== null) {
        throw new Error(`ddc process exited with code ${this.process.exitCode}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Server did not become ready within ${timeoutMs}ms`);
  }

  /** Stop the test server */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve();
        }, 5000);

        this.process?.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.process = null;
    }

    // Clean up temp directory
    if (this.tempDir) {
      try {
        await fs.rm(this.tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      this.tempDir = null;
    }
  }

  /** Read a file from the fixture directory */
  async readFile(relPath: string): Promise<string> {
    const fullPath = path.join(this.fixtureDir, relPath);
    return fs.readFile(fullPath, "utf-8");
  }

  /** Write a file to the fixture directory */
  async writeFile(relPath: string, content: string): Promise<void> {
    const fullPath = path.join(this.fixtureDir, relPath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  /** Modify a file in place */
  async modifyFile(relPath: string, modifier: (content: string) => string): Promise<void> {
    const content = await this.readFile(relPath);
    const modified = modifier(content);
    await this.writeFile(relPath, modified);
  }

  /** Delete a file from the fixture directory */
  async deleteFile(relPath: string): Promise<void> {
    const fullPath = path.join(this.fixtureDir, relPath);
    await fs.unlink(fullPath);
  }

  /** Wait for file watcher debounce */
  async waitDebounce(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
