//! Image resolution is separate from sandbox lifecycle backends.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::{Error, PendingOperation, Platform};

/// Describes how to obtain the immutable image for a sandbox.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase", tag = "type")]
pub enum ImageSource {
    /// Build an image from a Dockerfile and context.
    Build {
        /// Build context, relative to the applied manifest by default.
        context: PathBuf,
        /// Dockerfile path relative to the build context.
        dockerfile: PathBuf,
    },
    /// Resolve an image from an OCI registry reference.
    Reference {
        /// OCI image reference, optionally pinned by digest. Tags are resolved
        /// once when the Sandbox is created and do not update it in place.
        reference: String,
    },
}

impl ImageSource {
    /// Validates fields understood by the generic image layer.
    ///
    /// # Errors
    ///
    /// Returns [`Error::Invalid`] when a required path or reference is empty.
    pub fn validate(&self) -> Result<(), Error> {
        match self {
            Self::Build { context, dockerfile } => {
                if context.as_os_str().is_empty() {
                    return Err(Error::invalid("image.context", "must not be empty"));
                }
                if dockerfile.as_os_str().is_empty() {
                    return Err(Error::invalid("image.dockerfile", "must not be empty"));
                }
            }
            Self::Reference { reference } if reference.trim().is_empty() => {
                return Err(Error::invalid("image.reference", "must not be empty"));
            }
            Self::Reference { .. } => {}
        }
        Ok(())
    }

    /// Resolves paths relative to a caller-supplied source directory.
    #[must_use]
    pub fn resolve_from(&self, source_directory: &std::path::Path) -> Self {
        match self {
            Self::Build { context, dockerfile } => Self::Build {
                context: if context.is_relative() {
                    source_directory.join(context)
                } else {
                    context.clone()
                },
                dockerfile: dockerfile.clone(),
            },
            Self::Reference { .. } => self.clone(),
        }
    }
}

/// Inputs for resolving an image for one Sandbox Platform.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResolveRequest {
    /// Source description for the image.
    pub source: ImageSource,
    /// Platform the resulting image must support.
    pub platform: Platform,
}

/// An image resolved to a backend-consumable immutable digest and Platform.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ResolvedImage {
    /// The source used to resolve the image.
    pub source: ImageSource,
    /// The actual Platform selected from the image.
    pub platform: Platform,
    /// An immutable content digest.
    pub digest: String,
}

impl ResolvedImage {
    pub(crate) fn validate(&self) -> Result<(), Error> {
        self.source.validate()?;
        self.platform.validate()?;
        if self.digest.is_empty() {
            return Err(Error::invalid("image.digest", "must not be empty"));
        }
        Ok(())
    }
}

/// Resolves source descriptions into immutable images.
pub trait Resolver {
    /// Builds, fetches, or reuses the requested image.
    fn resolve<'a>(&'a self, request: &'a ResolveRequest) -> PendingOperation<'a, ResolvedImage>;
}
