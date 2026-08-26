use std::{path::PathBuf, rc::Rc};

use crate::{Agent, AgentId, Error, MountSpec};

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
        resolve_mount_sources(&mut desired, &request.source_directory).await?;
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
        let directory = canonical_or_original(directory).await;
        let mut matches = Vec::new();
        for record in self.store.list().await? {
            let mut closest_depth: Option<usize> = None;
            for source in association_directories(&record) {
                let source = canonical_or_original(source).await;
                if directory.starts_with(&source) {
                    closest_depth = Some(closest_depth.unwrap_or_default().max(source.components().count()));
                }
            }
            if let Some(depth) = closest_depth {
                matches.push((record, depth));
            }
        }
        let Some(depth) = matches.iter().map(|(_, depth)| *depth).max() else {
            return Err(Error::NotFound);
        };
        matches.retain(|(_, candidate_depth)| *candidate_depth == depth);
        if matches.len() != 1 {
            return Err(Error::Invalid(
                "multiple Agents were applied from this directory; specify --agent".into(),
            ));
        }
        matches.pop().map(|(record, _)| record.agent).ok_or(Error::NotFound)
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
    if current.agent.spec.sandbox.mounts != desired.spec.sandbox.mounts {
        return Err(Error::Immutable("spec.sandbox.mounts"));
    }
    if current.agent.spec.home != desired.spec.home {
        return Err(Error::Immutable("spec.home"));
    }
    if current.agent.spec.instructions != desired.spec.instructions {
        return Err(Error::Immutable("spec.instructions"));
    }
    let current_kinds = current
        .agent
        .spec
        .harnesses
        .iter()
        .map(|harness| harness.kind)
        .collect::<std::collections::BTreeSet<_>>();
    let desired_kinds = desired
        .spec
        .harnesses
        .iter()
        .map(|harness| harness.kind)
        .collect::<std::collections::BTreeSet<_>>();
    if current_kinds != desired_kinds {
        return Err(Error::Immutable("spec.harnesses.type"));
    }
    let current_auth = current
        .agent
        .spec
        .harnesses
        .iter()
        .map(|harness| (harness.kind, harness.auth))
        .collect::<std::collections::BTreeSet<_>>();
    let desired_auth = desired
        .spec
        .harnesses
        .iter()
        .map(|harness| (harness.kind, harness.auth))
        .collect::<std::collections::BTreeSet<_>>();
    if current_auth != desired_auth {
        return Err(Error::Immutable("spec.harnesses.auth"));
    }
    Ok(())
}

async fn resolve_mount_sources(agent: &mut Agent, source_directory: &std::path::Path) -> Result<(), Error> {
    for (index, mount) in agent.spec.sandbox.mounts.iter_mut().enumerate() {
        let MountSpec::Bind { source, .. } = mount else {
            continue;
        };
        let unresolved = if source.is_absolute() {
            source.clone()
        } else {
            source_directory.join(&*source)
        };
        let resolved = tokio::fs::canonicalize(&unresolved).await.map_err(|error| {
            Error::Invalid(format!(
                "spec.sandbox.mounts[{index}].source {} cannot be resolved: {error}",
                unresolved.display()
            ))
        })?;
        if !tokio::fs::metadata(&resolved).await?.is_dir() {
            return Err(Error::Invalid(format!(
                "spec.sandbox.mounts[{index}].source {} must identify a directory",
                resolved.display()
            )));
        }
        *source = resolved;
    }
    Ok(())
}

async fn canonical_or_original(path: &std::path::Path) -> PathBuf {
    tokio::fs::canonicalize(path)
        .await
        .unwrap_or_else(|_| path.to_path_buf())
}

fn association_directories(record: &AgentRecord) -> impl Iterator<Item = &std::path::Path> {
    std::iter::once(record.source_directory.as_path()).chain(record.agent.spec.sandbox.mounts.iter().filter_map(
        |mount| match mount {
            MountSpec::Bind { source, .. } => Some(source.as_path()),
            MountSpec::Tmpfs { .. } => None,
        },
    ))
}
