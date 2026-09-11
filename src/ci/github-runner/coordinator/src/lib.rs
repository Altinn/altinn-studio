mod coordinator;
mod github;
pub mod provider;

pub type AnyError = Box<dyn std::error::Error>;

pub use coordinator::{CoordinatorArguments, run};
