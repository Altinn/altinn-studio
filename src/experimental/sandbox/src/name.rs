use std::{fmt, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize, de};
use thiserror::Error;

/// Maximum length of a portable Sandbox name.
pub const MAX_SANDBOX_NAME_BYTES: usize = 63;

/// A portable, user-visible Sandbox name.
///
/// Names use the Kubernetes DNS-1123 label form: lowercase ASCII letters,
/// digits, and hyphens, with an alphanumeric character at both ends. This is
/// also a strict subset of the names accepted by Microsandbox.
#[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct SandboxName(String);

impl SandboxName {
    /// Validates and creates a Sandbox name.
    ///
    /// # Errors
    ///
    /// Returns an error when the value is empty, exceeds 63 bytes, or is not a
    /// DNS-1123 label.
    pub fn new(value: impl Into<String>) -> Result<Self, InvalidSandboxName> {
        let value = value.into();
        validate(&value)?;
        Ok(Self(value))
    }

    /// Returns whether `character` may appear anywhere in a Sandbox name.
    ///
    /// This is the per-keystroke filter for interactive input; the positional
    /// rules (alphanumeric first and last byte) still apply at validation.
    #[must_use]
    pub const fn accepts(character: char) -> bool {
        character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-'
    }

    /// Returns the name as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl AsRef<str> for SandboxName {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

impl fmt::Display for SandboxName {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for SandboxName {
    type Err = InvalidSandboxName;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::new(value)
    }
}

impl TryFrom<String> for SandboxName {
    type Error = InvalidSandboxName;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl TryFrom<&str> for SandboxName {
    type Error = InvalidSandboxName;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl<'de> Deserialize<'de> for SandboxName {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::new(value).map_err(de::Error::custom)
    }
}

/// Why a value cannot be used as a portable Sandbox name.
#[derive(Clone, Debug, Eq, Error, PartialEq)]
pub enum InvalidSandboxName {
    /// The value was empty.
    #[error("Sandbox name must not be empty")]
    Empty,
    /// The value exceeded the portable length limit.
    #[error("Sandbox name must not exceed {MAX_SANDBOX_NAME_BYTES} bytes (got {length})")]
    TooLong {
        /// Actual UTF-8 byte length.
        length: usize,
    },
    /// The value was not a DNS-1123 label.
    #[error(
        "Sandbox name must contain only lowercase ASCII letters, digits, or hyphens and must start and end with a letter or digit"
    )]
    InvalidSyntax,
}

fn validate(value: &str) -> Result<(), InvalidSandboxName> {
    if value.is_empty() {
        return Err(InvalidSandboxName::Empty);
    }
    if value.len() > MAX_SANDBOX_NAME_BYTES {
        return Err(InvalidSandboxName::TooLong { length: value.len() });
    }
    let bytes = value.as_bytes();
    if !is_alphanumeric(bytes[0])
        || !is_alphanumeric(bytes[bytes.len() - 1])
        || !bytes.iter().all(|byte| is_alphanumeric(*byte) || *byte == b'-')
    {
        return Err(InvalidSandboxName::InvalidSyntax);
    }
    Ok(())
}

const fn is_alphanumeric(byte: u8) -> bool {
    byte.is_ascii_lowercase() || byte.is_ascii_digit()
}
