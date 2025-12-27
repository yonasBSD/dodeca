//! Dodeca Pikru cell (cell-pikru)
//!
//! This cell handles rendering Pikchr diagrams to SVG using the pikru library.

use cell_pikru_proto::{PikruProcessor, PikruProcessorServer, PikruResult};

/// Pikru processor implementation
pub struct PikruProcessorImpl;

impl PikruProcessor for PikruProcessorImpl {
    async fn render(&self, source: String) -> PikruResult {
        // Render the Pikchr source to SVG
        match pikru::pikchr(&source) {
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
