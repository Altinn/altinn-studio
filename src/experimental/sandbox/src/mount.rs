//! Attachments materialized inside a Sandbox.

use std::{collections::BTreeSet, path::PathBuf};

use serde::{Deserialize, Serialize};

use crate::{ByteQuantity, SandboxPath, volume::VolumeId};

/// One form of filesystem attachment supported by a Sandbox Backend.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub enum MountKind {
    /// Persistent SDK-managed storage.
    Volume,
    /// A caller-selected host path.
    Bind,
    /// Anonymous in-memory storage.
    Tmpfs,
}

/// Deterministic set of supported Mount forms.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct MountKindSet(BTreeSet<MountKind>);

impl MountKindSet {
    /// Reports whether a Mount form is supported.
    #[must_use]
    pub fn contains(&self, kind: MountKind) -> bool {
        self.0.contains(&kind)
    }

    /// Iterates over supported forms in stable order.
    pub fn iter(&self) -> impl Iterator<Item = MountKind> + '_ {
        self.0.iter().copied()
    }
}

impl<const N: usize> From<[MountKind; N]> for MountKindSet {
    fn from(kinds: [MountKind; N]) -> Self {
        Self(kinds.into_iter().collect())
    }
}

/// One attachment inside a Sandbox.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Mount {
    /// Persistent storage managed through the Sandbox SDK.
    Volume {
        id: VolumeId,
        target: SandboxPath,
        read_only: bool,
    },
    /// A host path made visible to the Sandbox.
    Bind {
        source: PathBuf,
        target: SandboxPath,
        read_only: bool,
    },
    /// Anonymous in-memory storage with an explicit capacity limit.
    Tmpfs {
        target: SandboxPath,
        capacity: ByteQuantity,
    },
}

impl Mount {
    /// Returns this attachment's capability kind.
    #[must_use]
    pub const fn kind(&self) -> MountKind {
        match self {
            Self::Volume { .. } => MountKind::Volume,
            Self::Bind { .. } => MountKind::Bind,
            Self::Tmpfs { .. } => MountKind::Tmpfs,
        }
    }
}
