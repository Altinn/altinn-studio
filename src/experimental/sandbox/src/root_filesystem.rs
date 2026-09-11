//! Writable root filesystem configuration.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::ByteQuantity;

/// How an Image is materialized as a writable Sandbox root filesystem.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub enum RootFilesystemMode {
    /// Share an immutable Image and record Sandbox writes in a private layer.
    Layered,
    /// Materialize the complete Image into a private writable filesystem.
    Direct,
}

/// Deterministic set of root filesystem materialization modes.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct RootFilesystemModeSet(BTreeSet<RootFilesystemMode>);

impl RootFilesystemModeSet {
    /// Reports whether no root filesystem mode is supported.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// Reports whether a root filesystem mode is supported.
    #[must_use]
    pub fn contains(&self, mode: RootFilesystemMode) -> bool {
        self.0.contains(&mode)
    }

    /// Iterates over supported modes in stable order.
    pub fn iter(&self) -> impl Iterator<Item = RootFilesystemMode> + '_ {
        self.0.iter().copied()
    }

    /// Returns the modes present in both sets.
    #[must_use]
    pub fn intersection(&self, other: &Self) -> Self {
        Self(self.0.intersection(&other.0).copied().collect())
    }
}

impl<const N: usize> From<[RootFilesystemMode; N]> for RootFilesystemModeSet {
    fn from(modes: [RootFilesystemMode; N]) -> Self {
        Self(modes.into_iter().collect())
    }
}

/// Desired capacity and immutable materialization mode of a Sandbox root filesystem.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RootFilesystem {
    capacity: ByteQuantity,
    mode: RootFilesystemMode,
}

impl RootFilesystem {
    /// Creates a root filesystem configuration.
    #[must_use]
    pub const fn new(capacity: ByteQuantity, mode: RootFilesystemMode) -> Self {
        Self { capacity, mode }
    }

    /// Creates a capacity-efficient layered root filesystem.
    #[must_use]
    pub const fn layered(capacity: ByteQuantity) -> Self {
        Self::new(capacity, RootFilesystemMode::Layered)
    }

    /// Creates a fully materialized private root filesystem.
    #[must_use]
    pub const fn direct(capacity: ByteQuantity) -> Self {
        Self::new(capacity, RootFilesystemMode::Direct)
    }

    /// Returns the desired writable capacity.
    #[must_use]
    pub const fn capacity(self) -> ByteQuantity {
        self.capacity
    }

    /// Returns the immutable materialization mode.
    #[must_use]
    pub const fn mode(self) -> RootFilesystemMode {
        self.mode
    }
}
