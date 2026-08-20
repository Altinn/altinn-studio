//! Cohesive Sandbox Backend and Image Backend composition.

use crate::{backend::SandboxBackend, image};

/// Supplies the backend components that share one image materialization domain.
///
/// A provider keeps Sandbox lifecycle paired with the Image Backend that owns
/// its shared image materialization domain. Consumers compose a provider with
/// an optional Network Backend instead of pairing these components independently.
pub trait SandboxProvider {
    /// Returns the Sandbox Backend owned by this provider.
    fn backend(&self) -> &dyn SandboxBackend;

    /// Returns the Image Backend whose materialized images the Sandbox Backend consumes.
    fn image_backend(&self) -> &dyn image::ImageBackend;
}
