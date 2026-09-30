//! Single-threaded in-memory Agent Control Plane components.

use std::{cell::RefCell, collections::BTreeMap};

use sandbox::LocalFuture;
use time::OffsetDateTime;

use crate::{AgentId, Error, Status, resources::Changes};

use super::{AgentRecord, AgentStore};

/// In-memory Agent store with generation-based compare-and-swap writes.
///
/// Like the database, every successful write advances its change history.
#[derive(Default)]
pub struct InMemoryAgentStore {
    state: RefCell<State>,
    changes: Changes,
}

#[derive(Default)]
struct State {
    records: BTreeMap<AgentId, AgentRecord>,
    active_names: BTreeMap<String, AgentId>,
}

impl InMemoryAgentStore {
    /// Creates an empty store.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Creates an empty store whose writes advance `changes`.
    #[must_use]
    pub fn with_changes(changes: Changes) -> Self {
        Self {
            changes,
            ..Self::default()
        }
    }

    fn changed<T>(&self, result: Result<T, Error>) -> Result<T, Error> {
        if result.is_ok() {
            self.changes.bump();
        }
        result
    }
}

impl AgentStore for InMemoryAgentStore {
    fn get(&self, id: AgentId) -> LocalFuture<'_, Result<AgentRecord, Error>> {
        Box::pin(async move {
            let state = self.state.borrow();
            let record = state.records.get(&id).ok_or(Error::NotFound)?;
            (state.active_names.get(&record.agent.metadata.name) == Some(&id))
                .then(|| record.clone())
                .ok_or(Error::NotFound)
        })
    }

    fn get_by_name<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>> {
        Box::pin(async move {
            let state = self.state.borrow();
            let id = state.active_names.get(name).ok_or(Error::NotFound)?;
            state.records.get(id).cloned().ok_or(Error::NotFound)
        })
    }

    fn list(&self) -> LocalFuture<'_, Result<Vec<AgentRecord>, Error>> {
        Box::pin(async move {
            let state = self.state.borrow();
            Ok(state
                .active_names
                .values()
                .filter_map(|id| state.records.get(id))
                .cloned()
                .collect())
        })
    }

    fn put(&self, mut record: AgentRecord, expected_generation: u64) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            let result = (|| {
                record.agent.status.progress = None;
                record.agent.status.provenance = None;
                let id = record.id;
                let name = record.agent.metadata.name.clone();
                let mut state = self.state.borrow_mut();
                if expected_generation == 0 {
                    if state.active_names.contains_key(&name) || state.records.contains_key(&id) {
                        return Err(Error::Conflict);
                    }
                    state.active_names.insert(name, id);
                    state.records.insert(id, record);
                    return Ok(());
                }

                let active_id = state.active_names.get(&name).copied().ok_or(Error::Conflict)?;
                if active_id != id {
                    return Err(Error::Conflict);
                }
                let current = state.records.get_mut(&id).ok_or(Error::Conflict)?;
                if current.agent.metadata.generation != expected_generation
                    || current.agent.metadata.deletion_timestamp.is_some()
                {
                    return Err(Error::Conflict);
                }
                *current = record;
                Ok(())
            })();
            self.changed(result)
        })
    }

    fn update_status(
        &self,
        id: AgentId,
        generation: u64,
        mut status: Status,
    ) -> LocalFuture<'_, Result<Status, Error>> {
        Box::pin(async move {
            let result = (|| {
                status.progress = None;
                status.provenance = None;
                let mut state = self.state.borrow_mut();
                let name = state
                    .records
                    .get(&id)
                    .map(|record| record.agent.metadata.name.clone())
                    .ok_or(Error::NotFound)?;
                if state.active_names.get(&name) != Some(&id) {
                    return Err(Error::NotFound);
                }
                let record = state.records.get_mut(&id).ok_or(Error::NotFound)?;
                if record.agent.metadata.generation != generation {
                    return Err(Error::Conflict);
                }
                status.stamp_transitions(&record.agent.status, OffsetDateTime::now_utc());
                record.agent.status = status.clone();
                Ok(status)
            })();
            self.changed(result)
        })
    }

    fn mark_deleting<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>> {
        Box::pin(async move {
            let result = (|| {
                let mut state = self.state.borrow_mut();
                let id = state.active_names.get(name).copied().ok_or(Error::NotFound)?;
                let record = state.records.get_mut(&id).ok_or(Error::NotFound)?;
                if record.agent.metadata.deletion_timestamp.is_none() {
                    record.agent.metadata.deletion_timestamp = Some(OffsetDateTime::now_utc());
                }
                Ok(record.clone())
            })();
            self.changed(result)
        })
    }

    fn finalize_deletion(&self, id: AgentId, generation: u64) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            let result = (|| {
                let mut state = self.state.borrow_mut();
                let record = state.records.get_mut(&id).ok_or(Error::NotFound)?;
                if record.agent.metadata.generation != generation || record.agent.metadata.deletion_timestamp.is_none()
                {
                    return Err(Error::Conflict);
                }
                let name = record.agent.metadata.name.clone();
                if state.active_names.get(&name) != Some(&id) {
                    return Err(Error::NotFound);
                }
                state.active_names.remove(&name);
                Ok(())
            })();
            self.changed(result)
        })
    }
}
