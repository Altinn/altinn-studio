mod delete;
mod image_reference;
mod kvm;
mod provider;
mod shutdown;

pub type AnyError = Box<dyn std::error::Error>;

pub use delete::{delete_sandbox, delete_sandbox_of};
pub use image_reference::validate_immutable_image_reference;
pub use kvm::require_kvm;
pub use provider::{ProviderArguments, native_linux_platform};
pub use shutdown::ShutdownSignals;
