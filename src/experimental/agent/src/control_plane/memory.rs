//! Single-threaded in-memory Agent Control Plane components.

use std::{cell::RefCell, collections::BTreeMap};

use sandbox::LocalFuture;
use time::OffsetDateTime;

use crate::{AgentId, Error, Status};

use super::{AgentRecord, AgentStore};

/// In-memory Agent store with generation-based compare-and-swap writes.
#[derive(Default)]
pub struct InMemoryAgentStore {
    state: RefCell<State>,
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
        })
    }

    fn update_status(&self, id: AgentId, generation: u64, mut status: Status) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
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
            record.agent.status = status;
            Ok(())
        })
    }

    fn mark_deleting<'a>(&'a self, name: &'a str) -> LocalFuture<'a, Result<AgentRecord, Error>> {
        Box::pin(async move {
            let mut state = self.state.borrow_mut();
            let id = state.active_names.get(name).copied().ok_or(Error::NotFound)?;
            let record = state.records.get_mut(&id).ok_or(Error::NotFound)?;
            if record.agent.metadata.deletion_timestamp.is_none() {
                record.agent.metadata.deletion_timestamp = Some(OffsetDateTime::now_utc());
            }
            Ok(record.clone())
        })
    }

    fn finalize_deletion(&self, id: AgentId, generation: u64) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            let mut state = self.state.borrow_mut();
            let record = state.records.get_mut(&id).ok_or(Error::NotFound)?;
            if record.agent.metadata.generation != generation || record.agent.metadata.deletion_timestamp.is_none() {
                return Err(Error::Conflict);
            }
            let name = record.agent.metadata.name.clone();
            if state.active_names.get(&name) != Some(&id) {
                return Err(Error::NotFound);
            }
            state.active_names.remove(&name);
            Ok(())
        })
    }
}
