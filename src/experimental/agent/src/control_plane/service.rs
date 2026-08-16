use std::{path::PathBuf, rc::Rc};

use crate::{Agent, Error};

use super::{AgentRecord, SharedAgentStore};

/// Desired state supplied by a local API client.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ApplyRequest {
    /// Absolute directory against which local manifest sources are resolved.
    pub source_directory: PathBuf,
    /// Agent manifest to store.
    pub agent: Agent,
}

/// Wakes reconciliation after desired state changes.
pub trait Notifier {
    /// Schedules reconciliation without blocking the API request.
    fn notify(&self);
}

/// Agent Control Plane facade for desired-state operations.
pub struct ControlPlane {
    store: SharedAgentStore,
    notifier: Rc<dyn Notifier>,
}

impl ControlPlane {
    /// Creates an Agent Control Plane facade.
    #[must_use]
    pub fn new(store: SharedAgentStore, notifier: Rc<dyn Notifier>) -> Self {
        Self { store, notifier }
    }

    /// Stores desired state and returns without waiting for reconciliation.
    ///
    /// # Errors
    ///
    /// Returns an error when the request is invalid, changes an immutable field, conflicts with deletion,
    /// or cannot be stored.
    pub async fn apply(&self, request: ApplyRequest) -> Result<Agent, Error> {
        if !request.source_directory.is_absolute() {
            return Err(Error::Invalid("sourceDirectory must be absolute".into()));
        }

        let mut desired = request.agent;
        desired.clear_managed_fields();
        desired.validate()?;

        loop {
            let result = match self.store.get(&desired.metadata.name).await {
                Ok(current) => {
                    if current.agent.metadata.deletion_timestamp.is_some() {
                        return Err(Error::Conflict);
                    }
                    validate_immutable_fields(&current, &desired, &request.source_directory)?;
                    if current.agent.spec == desired.spec && current.source_directory == request.source_directory {
                        return Ok(current.agent);
                    }

                    let expected_generation = current.agent.metadata.generation;
                    desired.metadata.generation = expected_generation + 1;
                    desired.status = current.agent.status;
                    self.store
                        .put(
                            AgentRecord {
                                source_directory: request.source_directory.clone(),
                                agent: desired.clone(),
                            },
                            expected_generation,
                        )
                        .await
                }
                Err(Error::NotFound) => {
                    desired.metadata.generation = 1;
                    self.store
                        .put(
                            AgentRecord {
                                source_directory: request.source_directory.clone(),
                                agent: desired.clone(),
                            },
                            0,
                        )
                        .await
                }
                Err(error) => return Err(error),
            };

            match result {
                Err(Error::Conflict) => {}
                Err(error) => return Err(error),
                Ok(()) => {
                    self.notifier.notify();
                    return Ok(desired);
                }
            }
        }
    }

    /// Gets desired and most recently observed state.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent does not exist or storage fails.
    pub async fn get(&self, name: &str) -> Result<Agent, Error> {
        self.store.get(name).await.map(|record| record.agent)
    }

    /// Marks an Agent for asynchronous release. Repeated deletion is safe.
    ///
    /// # Errors
    ///
    /// Returns an error when the deletion marker cannot be stored.
    pub async fn delete(&self, name: &str) -> Result<(), Error> {
        match self.store.mark_deleting(name).await {
            Ok(_) => {
                self.notifier.notify();
                Ok(())
            }
            Err(Error::NotFound) => Ok(()),
            Err(error) => Err(error),
        }
    }
}

fn validate_immutable_fields(
    current: &AgentRecord,
    desired: &Agent,
    source_directory: &std::path::Path,
) -> Result<(), Error> {
    if current.agent.spec.sandbox.image != desired.spec.sandbox.image || current.source_directory != source_directory {
        return Err(Error::Immutable("spec.sandbox.image"));
    }
    if current.agent.spec.sandbox.platform != desired.spec.sandbox.platform {
        return Err(Error::Immutable("spec.sandbox.platform"));
    }
    Ok(())
}
