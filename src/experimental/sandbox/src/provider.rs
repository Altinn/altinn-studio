//! Cohesive Sandbox Backend and Image Resolver composition.

use crate::{backend::SandboxBackend, image};

/// Supplies the backend components that share one image materialization domain.
///
/// A provider keeps image resolution paired with the Backend that consumes the
/// resulting cache entries. Consumers compose a provider with an optional
/// Network Backend instead of pairing these components independently.
pub trait SandboxProvider {
    /// Returns the Sandbox Backend owned by this provider.
    fn backend(&self) -> &dyn SandboxBackend;

    /// Returns the Image Resolver whose results the Backend can consume.
    fn image_resolver(&self) -> &dyn image::Resolver;
}
