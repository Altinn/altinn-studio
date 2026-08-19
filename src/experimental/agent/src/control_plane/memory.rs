//! Single-threaded in-memory Agent Control Plane components.

use std::{cell::RefCell, collections::BTreeMap};

use sandbox::{LocalFuture, Platform, Sandbox, SandboxId};
use time::OffsetDateTime;

use crate::{Agent, Error, Status};

use super::{AgentRecord, AgentRuntimeBundle, AgentRuntimeBundleResolver, AgentRuntimeClient, AgentStore};

/// In-memory Agent store with generation-based compare-and-swap writes.
#[derive(Default)]
pub struct InMemoryAgentStore {
    records: RefCell<BTreeMap<String, AgentRecord>>,
}

impl InMemoryAgentStore {
    /// Creates an empty store.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}

impl AgentStore for InMemoryAgentStore {
    fn get<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>> {
        Box::pin(async move { self.records.borrow().get(name).cloned().ok_or(Error::NotFound) })
    }

    fn list(&self) -> LocalFuture<'_, Result<Vec<AgentRecord>, Error>> {
        Box::pin(async move { Ok(self.records.borrow().values().cloned().collect()) })
    }

    fn put(&self, record: AgentRecord, expected_generation: u64) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            let mut records = self.records.borrow_mut();
            match records.get(&record.agent.metadata.name) {
                None if expected_generation == 0 => {}
                Some(current)
                    if expected_generation != 0 && current.agent.metadata.generation == expected_generation => {}
                None | Some(_) => return Err(Error::Conflict),
            }
            records.insert(record.agent.metadata.name.clone(), record);
            Ok(())
        })
    }

    fn update_status<'a>(
        &'a self,
        name: &'a str,
        generation: u64,
        status: Status,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            let mut records = self.records.borrow_mut();
            let record = records.get_mut(name).ok_or(Error::NotFound)?;
            if record.agent.metadata.generation != generation {
                return Err(Error::Conflict);
            }
            record.agent.status = status;
            Ok(())
        })
    }

    fn mark_deleting<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>> {
        Box::pin(async move {
            let mut records = self.records.borrow_mut();
            let record = records.get_mut(name).ok_or(Error::NotFound)?;
            if record.agent.metadata.deletion_timestamp.is_none() {
                record.agent.metadata.deletion_timestamp = Some(OffsetDateTime::now_utc());
            }
            Ok(record.clone())
        })
    }

    fn delete<'a>(&'a self, name: &'a str, generation: u64) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            let mut records = self.records.borrow_mut();
            let record = records.get(name).ok_or(Error::NotFound)?;
            if record.agent.metadata.generation != generation {
                return Err(Error::Conflict);
            }
            records.remove(name);
            Ok(())
        })
    }
}

/// In-memory platform-aware Agent Runtime bundle resolver.
#[derive(Default)]
pub struct InMemoryAgentRuntimeBundleResolver {
    failure: RefCell<Option<String>>,
    bundles: RefCell<BTreeMap<String, AgentRuntimeBundle>>,
    latest_version: RefCell<Option<String>>,
    platform: RefCell<Option<Platform>>,
}

impl InMemoryAgentRuntimeBundleResolver {
    /// Creates a resolver without any materialized runtime bundle.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Configures a deterministic bundle-resolution failure for tests.
    pub fn fail_with(&self, message: impl Into<String>) {
        *self.failure.borrow_mut() = Some(message.into());
    }

    /// Configures the generic Sandbox inputs returned during resolution.
    pub fn resolve_with(&self, bundle: AgentRuntimeBundle) {
        let version = bundle.version.clone();
        self.bundles.borrow_mut().insert(version.clone(), bundle);
        self.latest_version.replace(Some(version));
    }

    /// Returns the most recently requested Sandbox Platform.
    #[must_use]
    pub fn platform(&self) -> Option<Platform> {
        self.platform.borrow().clone()
    }
}

impl AgentRuntimeBundleResolver for InMemoryAgentRuntimeBundleResolver {
    fn resolve<'a>(
        &'a self,
        platform: &'a Platform,
        pinned_version: Option<&'a str>,
    ) -> LocalFuture<'a, Result<AgentRuntimeBundle, Error>> {
        Box::pin(async move {
            *self.platform.borrow_mut() = Some(platform.clone());
            if let Some(message) = self.failure.borrow().clone() {
                return Err(Error::Runtime(message));
            }
            let version = pinned_version
                .map(ToOwned::to_owned)
                .or_else(|| self.latest_version.borrow().clone())
                .ok_or_else(|| Error::Runtime("no Agent Runtime bundle is available".into()))?;
            self.bundles
                .borrow()
                .get(&version)
                .cloned()
                .ok_or_else(|| Error::Runtime(format!("Agent Runtime bundle {version:?} is unavailable")))
        })
    }
}

/// In-memory Agent Runtime client recording successful readiness checks.
#[derive(Default)]
pub struct InMemoryAgentRuntimeClient {
    ready: RefCell<std::collections::BTreeSet<SandboxId>>,
    failure: RefCell<Option<String>>,
}

impl InMemoryAgentRuntimeClient {
    /// Creates a client without ready Agent Runtimes.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Configures a deterministic Agent Runtime communication failure for tests.
    pub fn fail_with(&self, message: impl Into<String>) {
        *self.failure.borrow_mut() = Some(message.into());
    }

    /// Reports whether readiness was verified for a Sandbox.
    #[must_use]
    pub fn is_ready(&self, id: &SandboxId) -> bool {
        self.ready.borrow().contains(id)
    }
}

impl AgentRuntimeClient for InMemoryAgentRuntimeClient {
    fn verify_ready<'a>(&'a self, _agent: &'a Agent, sandbox: &'a Sandbox) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            if let Some(message) = self.failure.borrow().clone() {
                return Err(Error::Runtime(message));
            }
            self.ready.borrow_mut().insert(sandbox.id.clone());
            Ok(())
        })
    }
}
