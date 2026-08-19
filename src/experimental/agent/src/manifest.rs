//! Strict decoding for Agent manifests.

use crate::{Agent, Error};

/// Decodes and validates a YAML or JSON Agent manifest.
///
/// # Errors
///
/// Returns an error when syntax, structure, or required values are invalid.
pub fn decode(bytes: &[u8]) -> Result<Agent, Error> {
    let agent: Agent = serde_yaml_ng::from_slice(bytes)?;
    agent.validate()?;
    Ok(agent)
}
