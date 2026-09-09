//! Paths interpreted inside a Sandbox.

use serde::{Deserialize, Serialize};

/// A path interpreted inside a Sandbox rather than on the caller's host.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct SandboxPath(String);

impl SandboxPath {
    /// Creates a Sandbox path from its backend-neutral representation.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// Returns the path as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
