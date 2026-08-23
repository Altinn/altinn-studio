use std::{path::PathBuf, rc::Rc};

use crate::{Agent, AgentId, Error};

use super::{AgentRecord, SharedAgentStore, Wakeup};

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
    fn notify(&self, id: crate::AgentId);
}

impl Notifier for Wakeup {
    fn notify(&self, id: crate::AgentId) {
        self.notify(id);
    }
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
            let result = match self.store.get_by_name(&desired.metadata.name).await {
                Ok(current) => {
                    if current.agent.metadata.deletion_timestamp.is_some() {
                        return Err(Error::Conflict);
                    }
                    validate_immutable_fields(&current, &desired, &request.source_directory)?;
                    if current.agent.spec == desired.spec && current.source_directory == request.source_directory {
                        self.notifier.notify(current.id);
                        return Ok(current.agent);
                    }

                    let expected_generation = current.agent.metadata.generation;
                    desired.metadata.generation = expected_generation + 1;
                    desired.status = current.agent.status;
                    self.store
                        .put(
                            AgentRecord {
                                id: current.id,
                                source_directory: request.source_directory.clone(),
                                agent: desired.clone(),
                            },
                            expected_generation,
                        )
                        .await
                        .map(|()| current.id)
                }
                Err(Error::NotFound) => {
                    let id = AgentId::generate();
                    desired.metadata.generation = 1;
                    self.store
                        .put(
                            AgentRecord {
                                id,
                                source_directory: request.source_directory.clone(),
                                agent: desired.clone(),
                            },
                            0,
                        )
                        .await
                        .map(|()| id)
                }
                Err(error) => return Err(error),
            };

            match result {
                Err(Error::Conflict) => {}
                Err(error) => return Err(error),
                Ok(id) => {
                    self.notifier.notify(id);
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
        self.store.get_by_name(name).await.map(|record| record.agent)
    }

    /// Lists every active Agent ordered by name.
    ///
    /// # Errors
    ///
    /// Returns an error when storage cannot be read.
    pub async fn list(&self) -> Result<Vec<Agent>, Error> {
        self.store
            .list()
            .await
            .map(|records| records.into_iter().map(|record| record.agent).collect())
    }

    /// Resolves the closest Agent source directory containing `directory`.
    ///
    /// # Errors
    ///
    /// Returns an error when no Agent matches, multiple Agents share the closest
    /// source directory, or storage cannot be read.
    pub async fn resolve_directory(&self, directory: &std::path::Path) -> Result<Agent, Error> {
        if !directory.is_absolute() {
            return Err(Error::Invalid("directory must be absolute".into()));
        }
        let mut matches = self
            .store
            .list()
            .await?
            .into_iter()
            .filter(|record| directory.starts_with(&record.source_directory))
            .collect::<Vec<_>>();
        let Some(depth) = matches
            .iter()
            .map(|record| record.source_directory.components().count())
            .max()
        else {
            return Err(Error::NotFound);
        };
        matches.retain(|record| record.source_directory.components().count() == depth);
        if matches.len() != 1 {
            return Err(Error::Invalid(
                "multiple Agents were applied from this directory; specify --agent".into(),
            ));
        }
        matches.pop().map(|record| record.agent).ok_or(Error::NotFound)
    }

    /// Marks an Agent for asynchronous release. Repeated deletion is safe.
    ///
    /// # Errors
    ///
    /// Returns an error when the deletion marker cannot be stored.
    pub async fn delete(&self, name: &str) -> Result<(), Error> {
        match self.store.mark_deleting(name).await {
            Ok(record) => {
                self.notifier.notify(record.id);
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
    if current.agent.spec.sandbox.init_system != desired.spec.sandbox.init_system {
        return Err(Error::Immutable("spec.sandbox.initSystem"));
    }
    if current.agent.spec.sandbox.resources.root_filesystem().mode()
        != desired.spec.sandbox.resources.root_filesystem().mode()
    {
        return Err(Error::Immutable("spec.sandbox.resources.rootFilesystem.mode"));
    }
    if current.agent.spec.home != desired.spec.home {
        return Err(Error::Immutable("spec.home"));
    }
    if current.agent.spec.instructions != desired.spec.instructions {
        return Err(Error::Immutable("spec.instructions"));
    }
    if current.agent.spec.harness.kind != desired.spec.harness.kind {
        return Err(Error::Immutable("spec.harness.type"));
    }
    if current.agent.spec.harness.auth != desired.spec.harness.auth {
        return Err(Error::Immutable("spec.harness.auth"));
    }
    Ok(())
}
