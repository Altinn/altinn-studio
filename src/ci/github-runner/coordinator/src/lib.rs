mod coordinator;
mod github;

pub type AnyError = Box<dyn std::error::Error>;

pub use coordinator::{CoordinatorArguments, run};
