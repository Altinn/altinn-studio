use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::Error;

/// OCI-aligned operating-system and architecture requirements for a Sandbox.
///
/// Values remain open strings so the generic SDK does not need a release for
/// every platform value introduced by an image or Sandbox Backend.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Platform {
    /// Operating system, such as `linux` or `windows`.
    pub os: String,
    /// CPU architecture, such as `amd64` or `arm64`.
    pub architecture: String,
    /// Architecture variant, such as an ARM version.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant: Option<String>,
    /// Operating-system version required for compatibility.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub os_version: Option<String>,
    /// Operating-system features required by the image.
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub os_features: BTreeSet<String>,
}

impl Platform {
    /// Creates a Platform without variant or operating-system constraints.
    #[must_use]
    pub fn new(os: impl Into<String>, architecture: impl Into<String>) -> Self {
        Self {
            os: os.into(),
            architecture: architecture.into(),
            variant: None,
            os_version: None,
            os_features: BTreeSet::new(),
        }
    }

    /// Creates a Platform for the host CPU architecture and the requested
    /// guest operating system.
    ///
    /// Architecture names use their OCI spelling so the result can be used
    /// directly for image and Sandbox selection.
    #[must_use]
    pub fn native(os: impl Into<String>) -> Self {
        let architecture = match std::env::consts::ARCH {
            "x86_64" => "amd64",
            "aarch64" => "arm64",
            architecture => architecture,
        };
        Self::new(os, architecture)
    }

    /// Returns whether this concrete Platform satisfies a requested Platform.
    ///
    /// Omitted variant and operating-system constraints act as wildcards. A
    /// concrete image may therefore add, but not contradict, those details.
    #[must_use]
    pub fn satisfies(&self, requested: &Self) -> bool {
        self.os == requested.os
            && self.architecture == requested.architecture
            && requested
                .variant
                .as_ref()
                .is_none_or(|variant| self.variant.as_ref() == Some(variant))
            && requested
                .os_version
                .as_ref()
                .is_none_or(|version| self.os_version.as_ref() == Some(version))
            && self.os_features.is_superset(&requested.os_features)
    }

    pub(crate) fn validate(&self) -> Result<(), Error> {
        if self.os.is_empty() {
            return Err(Error::invalid("platform.os", "must not be empty"));
        }
        if self.architecture.is_empty() {
            return Err(Error::invalid("platform.architecture", "must not be empty"));
        }
        if self.variant.as_ref().is_some_and(String::is_empty) {
            return Err(Error::invalid("platform.variant", "must not be empty when present"));
        }
        if self.os_version.as_ref().is_some_and(String::is_empty) {
            return Err(Error::invalid("platform.osVersion", "must not be empty when present"));
        }
        if self.os_features.contains("") {
            return Err(Error::invalid("platform.osFeatures", "must not contain an empty value"));
        }
        Ok(())
    }
}

impl std::fmt::Display for Platform {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}/{}", self.os, self.architecture)?;
        if let Some(variant) = &self.variant {
            write!(formatter, "/{variant}")?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::Platform;

    #[test]
    fn native_uses_oci_architecture_names() {
        let expected = match std::env::consts::ARCH {
            "x86_64" => "amd64",
            "aarch64" => "arm64",
            architecture => architecture,
        };

        assert_eq!(Platform::native("linux"), Platform::new("linux", expected));
    }
}
