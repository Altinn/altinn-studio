//! Discoverable functionality reported by Sandbox SDK interfaces.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::{
    image::ImageOperationCapabilities, mount::MountKindSet, network::NetworkEndpointCapabilities,
    root_filesystem::RootFilesystemModeSet,
};

/// Optional functionality that callers may require from a Sandbox implementation.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub enum SandboxFeature {
    /// Run addressable commands inside a Sandbox.
    Execution,
    /// Run bidirectional terminal Executions inside a Sandbox.
    TerminalExecution,
    /// Attach the caller's terminal to an interactive Sandbox Execution.
    TerminalAttach,
    /// Stream regular files to and from a running Sandbox.
    FileTransfer,
    /// Attach storage whose lifecycle is independent of a Sandbox.
    PersistentVolumes,
    /// Run a container engine inside the Sandbox.
    NestedContainers,
    /// Hand Sandbox initialization to the init system supplied by the Image.
    ImageInit,
}

/// A deterministic set of Sandbox Features.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(transparent)]
pub struct SandboxFeatureSet(BTreeSet<SandboxFeature>);

impl SandboxFeatureSet {
    /// Creates an empty feature set.
    #[must_use]
    pub const fn new() -> Self {
        Self(BTreeSet::new())
    }

    /// Reports whether one feature is available.
    #[must_use]
    pub fn contains(&self, feature: SandboxFeature) -> bool {
        self.0.contains(&feature)
    }

    /// Adds a feature.
    pub fn insert(&mut self, feature: SandboxFeature) {
        self.0.insert(feature);
    }

    /// Adds every feature in another set.
    pub fn extend(&mut self, other: &Self) {
        self.0.extend(other.0.iter().copied());
    }

    /// Iterates over available features in stable order.
    pub fn iter(&self) -> impl Iterator<Item = SandboxFeature> + '_ {
        self.0.iter().copied()
    }
}

impl<const N: usize> From<[SandboxFeature; N]> for SandboxFeatureSet {
    fn from(features: [SandboxFeature; N]) -> Self {
        Self(features.into_iter().collect())
    }
}

/// Platform-specific functionality reported by a Sandbox Backend.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct SandboxBackendCapabilities {
    /// Optional Sandbox operations implemented by the Backend.
    pub features: SandboxFeatureSet,
    /// Filesystem attachment forms accepted during Sandbox creation.
    pub mounts: MountKindSet,
    /// Root filesystem materialization modes accepted during Sandbox creation.
    pub root_filesystems: RootFilesystemModeSet,
    /// Network endpoint forms the Backend can expose.
    pub network: NetworkEndpointCapabilities,
}

/// Consumer-visible functionality available from a configured Sandbox Service.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SandboxCapabilities {
    features: SandboxFeatureSet,
    mount_kinds: MountKindSet,
    root_filesystem_modes: RootFilesystemModeSet,
    prepared_image_export: ImageOperationCapabilities,
    prepared_image_import: ImageOperationCapabilities,
    network_available: bool,
}

impl SandboxCapabilities {
    pub(crate) const fn new(
        features: SandboxFeatureSet,
        mount_kinds: MountKindSet,
        root_filesystem_modes: RootFilesystemModeSet,
        prepared_image_export: ImageOperationCapabilities,
        prepared_image_import: ImageOperationCapabilities,
        network_available: bool,
    ) -> Self {
        Self {
            features,
            mount_kinds,
            root_filesystem_modes,
            prepared_image_export,
            prepared_image_import,
            network_available,
        }
    }

    /// Returns optional Sandbox operations supported by the configured Provider.
    #[must_use]
    pub const fn features(&self) -> &SandboxFeatureSet {
        &self.features
    }

    /// Returns filesystem attachment forms accepted during Sandbox creation.
    #[must_use]
    pub const fn mount_kinds(&self) -> &MountKindSet {
        &self.mount_kinds
    }

    /// Returns root-filesystem modes accepted by both the Sandbox Backend and
    /// the Image Backend's resolve operation.
    #[must_use]
    pub const fn root_filesystem_modes(&self) -> &RootFilesystemModeSet {
        &self.root_filesystem_modes
    }

    /// Returns prepared-image export support for this Platform.
    #[must_use]
    pub const fn prepared_image_export(&self) -> &ImageOperationCapabilities {
        &self.prepared_image_export
    }

    /// Returns prepared-image import support for this Platform.
    #[must_use]
    pub const fn prepared_image_import(&self) -> &ImageOperationCapabilities {
        &self.prepared_image_import
    }

    /// Reports whether the configured Network Backend can use this Provider.
    #[must_use]
    pub const fn network_available(&self) -> bool {
        self.network_available
    }
}

impl SandboxBackendCapabilities {
    /// Creates one coherent capability report.
    #[must_use]
    pub const fn new(
        features: SandboxFeatureSet,
        mounts: MountKindSet,
        root_filesystems: RootFilesystemModeSet,
        network: NetworkEndpointCapabilities,
    ) -> Self {
        Self {
            features,
            mounts,
            root_filesystems,
            network,
        }
    }
}
