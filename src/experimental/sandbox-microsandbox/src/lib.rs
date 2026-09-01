//! Microsandbox implementation of the backend-neutral Sandbox SDK.
//!
//! The integration deliberately contains no Agent automation. It uses an
//! explicit Microsandbox home, materializes stopped Sandboxes in adapter-owned
//! state, and boots the underlying microVM only when the generic Backend is
//! started.

mod backend;
mod client;
mod encoding;
mod error;
mod execution;
mod files;
mod guest_tcp;
mod image;
mod network_backend;
mod network_endpoint;
mod platform;
mod state;
mod volumes;

pub use backend::{MicrosandboxProvider, MicrosandboxProviderBuilder};
pub use guest_tcp::{GuestTcpDialer, GuestTcpStream};
pub use network_backend::{MicrosandboxNetworkBackend, SecretBinding};
