//! Image materialization is separate from Sandbox lifecycle backends.

use std::{
    collections::BTreeSet,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use crate::{Error, LocalFuture, PendingOperation, Platform, RootFilesystemMode, RootFilesystemModeSet};

/// Transient credentials used while resolving an OCI registry reference.
///
/// Credentials configure a Provider's image materialization domain. They are
/// never part of a persisted [`ImageSource`] or [`ResolvedImage`].
#[derive(Clone, Eq, PartialEq)]
pub enum RegistryAuthentication {
    /// Access the registry without credentials.
    Anonymous,
    /// Authenticate with a username and password or access token.
    Basic {
        /// Registry username.
        username: String,
        /// Registry password or access token.
        password: String,
    },
}

/// The portable OCI identity form supplied to an Image Backend.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub enum ImageSourceKind {
    /// A Dockerfile and build context.
    Build,
    /// An OCI registry reference.
    Reference,
}

/// Deterministic set of supported OCI Image Source forms.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ImageSourceKindSet(BTreeSet<ImageSourceKind>);

impl ImageSourceKindSet {
    /// Reports whether no Image Source form is supported.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// Reports whether an Image Source form is supported.
    #[must_use]
    pub fn contains(&self, kind: ImageSourceKind) -> bool {
        self.0.contains(&kind)
    }

    /// Iterates over supported forms in stable order.
    pub fn iter(&self) -> impl Iterator<Item = ImageSourceKind> + '_ {
        self.0.iter().copied()
    }
}

impl<const N: usize> From<[ImageSourceKind; N]> for ImageSourceKindSet {
    fn from(kinds: [ImageSourceKind; N]) -> Self {
        Self(kinds.into_iter().collect())
    }
}

/// An operation exposed by an Image Backend.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ImageOperation {
    /// Resolve an OCI identity into a provider-consumable image.
    Resolve,
    /// Export a provider-owned prepared representation.
    PreparedImageExport,
    /// Import a provider-owned prepared representation.
    PreparedImageImport,
}

/// OCI source forms and materialization modes supported by one Image operation.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ImageOperationCapabilities {
    /// OCI Image Source forms accepted by the operation.
    pub sources: ImageSourceKindSet,
    /// Root filesystem modes accepted by the operation.
    pub root_filesystem_modes: RootFilesystemModeSet,
}

impl ImageOperationCapabilities {
    /// Creates one operation capability report.
    #[must_use]
    pub const fn new(sources: ImageSourceKindSet, root_filesystem_modes: RootFilesystemModeSet) -> Self {
        Self {
            sources,
            root_filesystem_modes,
        }
    }

    /// Reports whether the operation accepts at least one source and mode pair.
    ///
    /// Operation capabilities describe the Cartesian product of the two sets,
    /// so either set being empty makes the operation unavailable.
    #[must_use]
    pub fn is_available(&self) -> bool {
        !self.sources.is_empty() && !self.root_filesystem_modes.is_empty()
    }
}

/// Platform-specific functionality reported by an Image Backend.
///
/// An operation is unavailable when either of its capability sets is empty.
/// Materialization formats are provider-owned and are not transferable between
/// providers; the portable identity remains the OCI build or registry reference
/// from which a prepared image is derived.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ImageBackendCapabilities {
    /// Supported image resolution inputs.
    pub resolve: ImageOperationCapabilities,
    /// Supported prepared-image exports.
    pub prepared_image_export: ImageOperationCapabilities,
    /// Supported prepared-image imports.
    pub prepared_image_import: ImageOperationCapabilities,
}

impl ImageBackendCapabilities {
    /// Creates one coherent Image Backend capability report.
    #[must_use]
    pub const fn new(
        resolve: ImageOperationCapabilities,
        prepared_image_export: ImageOperationCapabilities,
        prepared_image_import: ImageOperationCapabilities,
    ) -> Self {
        Self {
            resolve,
            prepared_image_export,
            prepared_image_import,
        }
    }
}

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
    /// Returns this source's capability kind.
    #[must_use]
    pub const fn kind(&self) -> ImageSourceKind {
        match self {
            Self::Build { .. } => ImageSourceKind::Build,
            Self::Reference { .. } => ImageSourceKind::Reference,
        }
    }

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
    /// Filesystem representation required by the Sandbox consuming the image.
    pub root_filesystem_mode: RootFilesystemMode,
}

impl ResolveRequest {
    pub(crate) fn validate(&self) -> Result<(), Error> {
        self.source.validate()?;
        self.platform.validate()
    }
}

/// An image resolved to a backend-consumable immutable digest and Platform.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ResolvedImage {
    /// The source used to resolve the image.
    pub source: ImageSource,
    /// The actual Platform selected from the image.
    pub platform: Platform,
    /// Immutable digest of the platform-specific OCI image manifest.
    ///
    /// Resolving a multi-platform image index selects its matching manifest;
    /// an index digest is never returned here.
    pub manifest_digest: String,
}

/// Description of a transportable, fully materialized OCI image.
///
/// A prepared image is a pristine derivative of [`ResolvedImage`], never a
/// parallel image identity. The artifact stored at the caller-selected path is
/// opaque: its representation is owned by the Provider and can only be returned
/// to a compatible Provider. The generic API assumes neither a guest operating
/// system nor a concrete filesystem format.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PreparedImage {
    /// Immutable OCI Image represented by the prepared artifact.
    pub image: ResolvedImage,
    /// Root filesystem representation for which the image was materialized.
    pub root_filesystem_mode: RootFilesystemMode,
    /// Content digest of the complete filesystem artifact.
    pub artifact_digest: String,
    /// Logical size of the uncompressed filesystem artifact.
    pub virtual_size_bytes: u64,
}

impl PreparedImage {
    /// Checks that backend-returned metadata is coherent with the request.
    ///
    /// This validates metadata only. Artifact integrity and the binding between
    /// the opaque artifact and requested OCI identity are Image Backend
    /// obligations.
    pub(crate) fn validate_for(&self, request: &ResolveRequest) -> Result<(), Error> {
        self.image.validate()?;
        if self.image.source != request.source {
            return Err(Error::invalid(
                "preparedImage.image.source",
                "must match the requested Image Source",
            ));
        }
        if !self.image.platform.satisfies(&request.platform) {
            return Err(Error::ImagePlatformMismatch {
                requested: Box::new(request.platform.clone()),
                actual: Box::new(self.image.platform.clone()),
            });
        }
        if self.root_filesystem_mode != request.root_filesystem_mode {
            return Err(Error::invalid(
                "preparedImage.rootFilesystemMode",
                "must match the requested root filesystem mode",
            ));
        }
        if self.artifact_digest.is_empty() {
            return Err(Error::invalid("preparedImage.artifactDigest", "must not be empty"));
        }
        if self.virtual_size_bytes == 0 {
            return Err(Error::invalid(
                "preparedImage.virtualSizeBytes",
                "must be greater than zero",
            ));
        }
        Ok(())
    }
}

impl ResolvedImage {
    pub(crate) fn validate(&self) -> Result<(), Error> {
        self.source.validate()?;
        self.platform.validate()?;
        if self.manifest_digest.is_empty() {
            return Err(Error::invalid("image.manifestDigest", "must not be empty"));
        }
        Ok(())
    }
}

/// Owns image materialization for a paired Sandbox Backend.
///
/// Every operation is capability-discovered per [`Platform`]. Implementations
/// must define all operations explicitly, including providers for which prepared
/// transport is unnecessary and therefore reported with empty capability sets.
pub trait ImageBackend {
    /// Reports functionality available for one Platform.
    ///
    /// Discovery must be side-effect-free and stable for the duration of the
    /// caller's operation. Implementations may perform asynchronous host discovery.
    fn capabilities<'a>(&'a self, platform: &'a Platform) -> LocalFuture<'a, Result<ImageBackendCapabilities, Error>>;

    /// Builds, fetches, or reuses the requested image.
    fn resolve<'a>(&'a self, request: &'a ResolveRequest) -> PendingOperation<'a, ResolvedImage>;

    /// Exports a resolved, fully materialized image to an opaque artifact.
    ///
    /// Returned metadata must be derived from the exported artifact and describe
    /// the OCI identity and Platform actually materialized.
    fn export_prepared_image<'a>(
        &'a self,
        request: &'a ResolveRequest,
        destination: &'a Path,
    ) -> PendingOperation<'a, PreparedImage>;

    /// Validates and imports an opaque prepared image into this Backend's
    /// materialization domain.
    ///
    /// Before returning, the implementation must validate artifact integrity,
    /// bind the artifact to the requested OCI identity and Platform, and return
    /// metadata that reflects the validated artifact rather than merely asserting
    /// values supplied by the request.
    fn import_prepared_image<'a>(
        &'a self,
        request: &'a ResolveRequest,
        source: &'a Path,
    ) -> PendingOperation<'a, PreparedImage>;
}
