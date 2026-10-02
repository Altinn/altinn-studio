//! In-memory SSH host key storage for tests and single-process use.

use std::{cell::RefCell, collections::BTreeMap};

use ::sandbox::LocalFuture;
use zeroize::Zeroizing;

use crate::{AgentId, Error};

use super::HostKeyStore;

/// Keeps host keys in process memory.
#[derive(Default)]
pub struct InMemoryHostKeyStore {
    keys: RefCell<BTreeMap<AgentId, Zeroizing<Vec<u8>>>>,
}

impl InMemoryHostKeyStore {
    /// Creates an empty store.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns whether a host key is stored for the incarnation.
    #[must_use]
    pub fn contains(&self, id: AgentId) -> bool {
        self.keys.borrow().contains_key(&id)
    }
}

impl HostKeyStore for InMemoryHostKeyStore {
    fn load_host_key(&self, id: AgentId) -> LocalFuture<'_, Result<Option<Zeroizing<Vec<u8>>>, Error>> {
        Box::pin(async move { Ok(self.keys.borrow().get(&id).cloned()) })
    }

    fn store_host_key(&self, id: AgentId, key: Zeroizing<Vec<u8>>) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.keys.borrow_mut().insert(id, key);
            Ok(())
        })
    }

    fn delete_host_key(&self, id: AgentId) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.keys.borrow_mut().remove(&id);
            Ok(())
        })
    }
}
