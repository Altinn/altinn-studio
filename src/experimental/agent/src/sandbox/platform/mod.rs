//! Sandbox operating-system-specific adapters.

mod linux;

pub use linux::Linux;
pub(crate) use linux::{HOME, WORKING_DIRECTORY};
