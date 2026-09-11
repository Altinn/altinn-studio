//! Host-owned secret references and material used by trusted mediators.

use crate::{Error, LocalFuture};
use zeroize::Zeroizing;

/// An opaque reference to secret material kept outside sandbox state.
#[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct SecretReference(String);

impl SecretReference {
    /// Restores an opaque reference issued by a Secret Store implementation.
    ///
    /// Application code normally obtains references from [`SecretStore::set`].
    #[must_use]
    pub fn from_opaque(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// Returns the opaque reference value.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Secret bytes that are zeroed when their host-side owner releases them.
pub struct SecretMaterial(Zeroizing<Vec<u8>>);

impl SecretMaterial {
    /// Takes ownership of secret bytes.
    #[must_use]
    pub fn new(value: Vec<u8>) -> Self {
        Self(Zeroizing::new(value))
    }

    /// Borrows the secret bytes without creating another copy.
    #[must_use]
    pub fn expose(&self) -> &[u8] {
        self.0.as_slice()
    }
}

impl std::fmt::Debug for SecretMaterial {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("SecretMaterial([REDACTED])")
    }
}

/// Stores secret material separately from sandbox disks and networking.
pub trait SecretStore {
    /// Creates or replaces a named value and returns its opaque reference.
    fn set<'a>(&'a self, name: &'a str, value: &'a [u8]) -> LocalFuture<'a, Result<SecretReference, Error>>;

    /// Resolves current material for an already-authorized host-mediated use.
    fn resolve<'a>(&'a self, reference: &'a SecretReference) -> LocalFuture<'a, Result<SecretMaterial, Error>>;
}
