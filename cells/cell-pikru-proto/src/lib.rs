//! RPC protocol for dodeca Pikru cell
//!
//! Defines services for rendering Pikchr diagrams to SVG.

use facet::Facet;

/// Result of Pikru rendering operations
#[derive(Debug, Clone, Facet)]
#[repr(u8)]
pub enum PikruResult {
    /// Successfully rendered diagram to SVG
    Success { svg: String },
    /// Error during rendering
    Error { message: String },
}

/// Pikru diagram rendering service implemented by the cell.
///
/// The host calls these methods to render Pikchr diagrams to SVG.
#[allow(async_fn_in_trait)]
#[rapace::service]
pub trait PikruProcessor {
    /// Render a Pikchr diagram to SVG.
    ///
    /// Takes Pikchr source code and returns SVG output.
    async fn render(&self, source: String) -> PikruResult;
}
