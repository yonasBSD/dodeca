#!/bin/bash
# Update homebrew tap with new release
# Usage: scripts/update-homebrew.sh <version>
# Example: scripts/update-homebrew.sh v0.2.12
# Requires: HOMEBREW_TAP_TOKEN environment variable
set -euo pipefail

VERSION="${1:?Usage: $0 <version>}"
VERSION_NUM="${VERSION#v}"  # Strip 'v' prefix if present

REPO="bearcove/dodeca"
TAP_REPO="bearcove/homebrew-tap"

echo "Updating homebrew tap for version $VERSION_NUM..."

# Calculate SHA256 checksums for each platform
echo "Calculating checksums..."
DARWIN_ARM64_SHA=$(sha256sum "dist/dodeca-aarch64-apple-darwin.tar.xz" | cut -d' ' -f1)
DARWIN_X86_64_SHA=$(sha256sum "dist/dodeca-x86_64-apple-darwin.tar.xz" 2>/dev/null | cut -d' ' -f1 || echo "")
LINUX_ARM64_SHA=$(sha256sum "dist/dodeca-aarch64-unknown-linux-gnu.tar.xz" | cut -d' ' -f1)
LINUX_X86_64_SHA=$(sha256sum "dist/dodeca-x86_64-unknown-linux-gnu.tar.xz" | cut -d' ' -f1)

echo "  darwin-arm64:  $DARWIN_ARM64_SHA"
echo "  linux-arm64:   $LINUX_ARM64_SHA"
echo "  linux-x86_64:  $LINUX_X86_64_SHA"

# Generate the formula
cat > dodeca.rb << EOF
class Dodeca < Formula
  desc "A fully incremental static site generator"
  homepage "https://github.com/${REPO}"
  version "${VERSION_NUM}"
  license any_of: ["MIT", "Apache-2.0"]

  on_macos do
    on_arm do
      url "https://github.com/${REPO}/releases/download/${VERSION}/dodeca-aarch64-apple-darwin.tar.xz"
      sha256 "${DARWIN_ARM64_SHA}"
    end
    on_intel do
      # Intel Mac not currently built - use ARM binary under Rosetta or build from source
      url "https://github.com/${REPO}/releases/download/${VERSION}/dodeca-aarch64-apple-darwin.tar.xz"
      sha256 "${DARWIN_ARM64_SHA}"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/${REPO}/releases/download/${VERSION}/dodeca-aarch64-unknown-linux-gnu.tar.xz"
      sha256 "${LINUX_ARM64_SHA}"
    end
    on_intel do
      url "https://github.com/${REPO}/releases/download/${VERSION}/dodeca-x86_64-unknown-linux-gnu.tar.xz"
      sha256 "${LINUX_X86_64_SHA}"
    end
  end

  def install
    bin.install "ddc"
    # Install plugins
    if File.directory?("plugins")
      (lib/"dodeca/plugins").install Dir["plugins/*"]
    end
  end

  test do
    system "#{bin}/ddc", "--version"
  end
end
EOF

echo "Generated dodeca.rb"

# Clone the tap repo, update, and push
echo "Updating homebrew tap..."
WORK_DIR=$(mktemp -d)
trap "rm -rf '$WORK_DIR'" EXIT

git clone "https://x-access-token:${HOMEBREW_TAP_TOKEN}@github.com/${TAP_REPO}.git" "$WORK_DIR/tap"
cp dodeca.rb "$WORK_DIR/tap/Formula/dodeca.rb"

cd "$WORK_DIR/tap"
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add Formula/dodeca.rb
git commit -m "dodeca ${VERSION_NUM}"
git push

echo "Homebrew tap updated successfully!"
