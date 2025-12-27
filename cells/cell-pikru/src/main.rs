//! Dodeca Pikru cell (cell-pikru)
//!
//! This cell handles rendering Pikchr diagrams to SVG using the pikru library.

use cell_pikru_proto::{PikruProcessor, PikruProcessorServer, PikruResult};

/// Pikru processor implementation
pub struct PikruProcessorImpl;

impl PikruProcessor for PikruProcessorImpl {
    async fn render(&self, source: String, css_variables: bool) -> PikruResult {
        // Parse the Pikchr source
        let program = match pikru::parse::parse(&source) {
            Ok(prog) => prog,
            Err(e) => {
                return PikruResult::Error {
                    message: format!("{}", e),
                };
            }
        };

        // Expand macros
        let program = match pikru::macros::expand_macros(program) {
            Ok(prog) => prog,
            Err(e) => {
                return PikruResult::Error {
                    message: format!("{}", e),
                };
            }
        };

        // Render to SVG with options
        let options = pikru::render::RenderOptions { css_variables };
        match pikru::render::render_with_options(&program, &options) {
            Ok(svg) => PikruResult::Success { svg },
            Err(e) => PikruResult::Error {
                message: format!("{}", e),
            },
        }
    }
}

rapace_cell::cell_service!(PikruProcessorServer<PikruProcessorImpl>, PikruProcessorImpl);

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    rapace_cell::run(CellService::from(PikruProcessorImpl)).await?;
    Ok(())
}
