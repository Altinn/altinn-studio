//! Selection of the process responsible for initializing a Sandbox.

use serde::{Deserialize, Serialize};

/// Selects which init system owns the Sandbox after backend setup.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum InitSystem {
    /// Keep the Sandbox Backend's built-in init process.
    #[default]
    Backend,
    /// Hand initialization to the init system supplied by the Image.
    Image,
}
