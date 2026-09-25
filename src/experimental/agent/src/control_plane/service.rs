use std::{path::PathBuf, rc::Rc};

use ignore::WalkBuilder;

use crate::{Agent, AgentId, Error, MountSpec, progress::ProvisioningState};

use super::{AgentRecord, SharedAgentStore, Wakeup};

/// Desired state supplied by a local API client.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ApplyRequest {
    /// Absolute directory against which local manifest sources are resolved.
    pub source_directory: PathBuf,
    /// Absolute path of the manifest being applied, recorded for discovery.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub manifest_path: Option<PathBuf>,
    /// Absolute path of the file supplying declared manifest values. Defaults to `.env` beside the
    /// manifest; omitted on an update keeps the recorded path.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub env_file: Option<PathBuf>,
    /// Fail instead of updating when the name already identifies an Agent.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub create_only: bool,
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
    provisioning: ProvisioningState,
}

impl ControlPlane {
    /// Creates an Agent Control Plane facade.
    #[must_use]
    pub fn new(store: SharedAgentStore, notifier: Rc<dyn Notifier>) -> Self {
        Self {
            store,
            notifier,
            provisioning: ProvisioningState::default(),
        }
    }

    /// Projects the reconciler's in-memory provisioning state onto returned Agents.
    #[must_use]
    pub fn with_provisioning(mut self, provisioning: ProvisioningState) -> Self {
        self.provisioning = provisioning;
        self
    }

    /// Stores desired state and returns without waiting for reconciliation.
    ///
    /// # Errors
    ///
    /// Returns an error when the request is invalid, changes an immutable field, conflicts with deletion,
    /// or cannot be stored.
    pub async fn apply(&self, request: ApplyRequest) -> Result<Agent, Error> {
        validate_request_paths(&request)?;

        let mut desired = request.agent;
        desired.clear_managed_fields();
        resolve_mount_sources(&mut desired, &request.source_directory).await?;
        desired.validate()?;
        reject_dot_env_in_bind_mounts(&desired).await?;

        loop {
            let result = match self.store.get_by_name(&desired.metadata.name).await {
                Ok(current) => {
                    if request.create_only {
                        return Err(Error::Invalid(format!(
                            "an Agent named {:?} already exists",
                            desired.metadata.name
                        )));
                    }
                    if current.agent.metadata.deletion_timestamp.is_some() {
                        return Err(Error::Conflict);
                    }
                    if current.source_directory != request.source_directory {
                        return Err(Error::Immutable("sourceDirectory"));
                    }
                    validate_immutable_fields(&current, &desired)?;
                    let manifest_path = request.manifest_path.clone().or_else(|| current.manifest_path.clone());
                    let env_file = request.env_file.clone().or_else(|| current.env_file.clone());
                    self.reject_exposed_secret_files(
                        current.id,
                        &request.source_directory,
                        env_file.as_deref(),
                        &desired,
                    )
                    .await?;
                    if current.agent.spec == desired.spec
                        && current.manifest_path == manifest_path
                        && current.env_file == env_file
                    {
                        self.notifier.notify(current.id);
                        return Ok(self.resource(current));
                    }

                    let expected_generation = current.agent.metadata.generation;
                    desired.metadata.generation = expected_generation + 1;
                    desired.status = current.agent.status;
                    self.store
                        .put(
                            AgentRecord {
                                id: current.id,
                                source_directory: request.source_directory.clone(),
                                manifest_path: manifest_path.clone(),
                                env_file: env_file.clone(),
                                agent: desired.clone(),
                            },
                            expected_generation,
                        )
                        .await
                        .map(|()| (current.id, manifest_path, env_file))
                }
                Err(Error::NotFound) => {
                    let id = AgentId::generate();
                    desired.metadata.generation = 1;
                    self.reject_exposed_secret_files(
                        id,
                        &request.source_directory,
                        request.env_file.as_deref(),
                        &desired,
                    )
                    .await?;
                    self.store
                        .put(
                            AgentRecord {
                                id,
                                source_directory: request.source_directory.clone(),
                                manifest_path: request.manifest_path.clone(),
                                env_file: request.env_file.clone(),
                                agent: desired.clone(),
                            },
                            0,
                        )
                        .await
                        .map(|()| (id, request.manifest_path.clone(), request.env_file.clone()))
                }
                Err(error) => return Err(error),
            };

            match result {
                Err(Error::Conflict) => {}
                Err(error) => return Err(error),
                Ok((id, manifest_path, env_file)) => {
                    self.notifier.notify(id);
                    desired.status.provenance = Some(crate::Provenance {
                        source_directory: request.source_directory,
                        manifest_path,
                        env_file,
                    });
                    return Ok(desired);
                }
            }
        }
    }

    /// Rejects desired state that would expose a selected secret file inside a Sandbox.
    ///
    /// Secret files hold the real values that mediation exists to keep out of Sandboxes. A bind
    /// mount whose source contains this Agent's selected non-default secret file or another active
    /// Agent's selected secret file would hand those values to the guest, so the combination is
    /// refused at apply time. Default `.env` files are covered by the bind-source scan above. Bind
    /// mount sources are canonical by this point.
    async fn reject_exposed_secret_files(
        &self,
        id: AgentId,
        source_directory: &std::path::Path,
        env_file: Option<&std::path::Path>,
        desired: &Agent,
    ) -> Result<(), Error> {
        let mut secret_files = Vec::new();
        if !desired.spec.secrets.is_empty() {
            let path = env_file.map_or_else(|| source_directory.join(super::resource::ENV_FILE), PathBuf::from);
            if env_file.is_some() || tokio::fs::try_exists(&path).await? {
                secret_files.push((desired.metadata.name.clone(), canonical_secret_file(&path).await));
            }
        }
        let mut mounts = bind_mount_sources(desired);
        for other in self.store.list().await? {
            if other.id == id || other.agent.metadata.deletion_timestamp.is_some() {
                continue;
            }
            if !other.agent.spec.secrets.is_empty() {
                let path = other.env_file_path();
                if other.env_file.is_some() || tokio::fs::try_exists(&path).await? {
                    secret_files.push((other.agent.metadata.name.clone(), canonical_secret_file(&path).await));
                }
            }
            if !desired.spec.secrets.is_empty() {
                mounts.extend(
                    bind_mount_sources(&other.agent)
                        .into_iter()
                        .map(|(_, source)| (format!("Agent {:?}", other.agent.metadata.name), source)),
                );
            }
        }
        for (owner, secret_file) in &secret_files {
            for (mount, source) in &mounts {
                if secret_file.starts_with(source) {
                    return Err(Error::Invalid(format!(
                        "{mount} bind-mounts {} which contains the secret file {} of Agent {owner:?}; \
                         the Sandbox would see its real values. Keep secret files outside mounted directories, \
                         for example with `agentctl apply --env-file`",
                        source.display(),
                        secret_file.display(),
                    )));
                }
            }
        }
        Ok(())
    }

    /// Gets desired and most recently observed state.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent does not exist or storage fails.
    pub async fn get(&self, name: &str) -> Result<Agent, Error> {
        self.store.get_by_name(name).await.map(|record| self.resource(record))
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
            .map(|records| records.into_iter().map(|record| self.resource(record)).collect())
    }

    /// Reads an Agent's stored status and the complete progress of its latest
    /// pass. When `output` names that pass, only later output is included.
    ///
    /// # Errors
    ///
    /// Returns an error when the Agent does not exist or storage fails.
    pub async fn progress(
        &self,
        name: &str,
        output: Option<crate::progress::OutputPosition>,
    ) -> Result<(crate::Status, Option<crate::progress::Provisioning>), Error> {
        let record = self.store.get_by_name(name).await?;
        let provisioning = self.provisioning.get(record.id).map(|mut provisioning| {
            if let Some(output) = output.filter(|output| output.pass == provisioning.pass) {
                provisioning.progress = provisioning.progress.output_from(output.sequence);
            }
            provisioning
        });
        Ok((record.agent.status, provisioning))
    }

    /// Resolves the closest Agent source directory containing `directory`.
    ///
    /// # Errors
    ///
    /// Returns an error when no Agent matches, multiple Agents share the closest
    /// source directory, or storage cannot be read.
    pub async fn resolve_directory(&self, directory: &std::path::Path) -> Result<Agent, Error> {
        self.resolve_directory_variant(directory, None).await
    }

    /// Resolves the closest Agent associated with `directory`, optionally by
    /// the variant encoded in its recorded leaf manifest filename.
    ///
    /// When several closest Agents tie without an explicit variant, exactly one
    /// Agent originating from the default `agent.yaml` manifest is preferred.
    ///
    /// # Errors
    ///
    /// Returns an error when no Agent matches, selection remains ambiguous, or
    /// storage cannot be read.
    pub async fn resolve_directory_variant(
        &self,
        directory: &std::path::Path,
        variant: Option<&crate::AgentVariantName>,
    ) -> Result<Agent, Error> {
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
        if let Some(variant) = variant {
            let filename = variant.filename();
            matches.retain(|(record, _)| {
                record
                    .manifest_path
                    .as_deref()
                    .and_then(std::path::Path::file_name)
                    .is_some_and(|name| name == filename.as_str())
            });
            if matches.is_empty() {
                return Err(Error::Invalid(format!(
                    "no Agent associated with this directory was applied from {filename}"
                )));
            }
        } else if matches.len() > 1 {
            let defaults = matches
                .iter()
                .enumerate()
                .filter_map(|(index, (record, _))| {
                    let filename = record
                        .manifest_path
                        .as_deref()
                        .and_then(std::path::Path::file_name)
                        .or_else(|| Some(std::ffi::OsStr::new(crate::manifest::MANIFEST_FILE)));
                    (filename == Some(std::ffi::OsStr::new(crate::manifest::MANIFEST_FILE))).then_some(index)
                })
                .collect::<Vec<_>>();
            if let [index] = defaults.as_slice() {
                return Ok(self.resource(matches.swap_remove(*index).0));
            }
        }
        if matches.len() != 1 {
            let mut names = matches
                .iter()
                .map(|(record, _)| record.agent.metadata.name.clone())
                .collect::<Vec<_>>();
            names.sort();
            return Err(Error::Invalid(format!(
                "multiple Agents were applied from this directory ({}); specify --agent or --variant",
                names.join(", ")
            )));
        }
        matches
            .pop()
            .map(|(record, _)| self.resource(record))
            .ok_or(Error::NotFound)
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

/// Rejects any bind source containing a `.env` file, case-insensitively and regardless of ignores.
///
/// Filesystem traversal is blocking and may cover a whole checkout, so it stays off the local
/// async runtime. Directories named `.env` are allowed. Symbolic links are not followed, but a
/// link itself named `.env` is rejected.
async fn reject_dot_env_in_bind_mounts(agent: &Agent) -> Result<(), Error> {
    let mounts = bind_mount_sources(agent);
    tokio::task::spawn_blocking(move || {
        for (field, source) in mounts {
            for result in WalkBuilder::new(&source)
                .hidden(false)
                .ignore(false)
                .git_ignore(false)
                .git_global(false)
                .git_exclude(false)
                .parents(false)
                .follow_links(false)
                .build()
            {
                let entry = result.map_err(|error| {
                    Error::Invalid(format!(
                        "cannot inspect {field}.source {} for .env files: {error}",
                        source.display()
                    ))
                })?;
                let is_directory = entry.file_type().is_some_and(|kind| kind.is_dir());
                let is_env_file = entry
                    .file_name()
                    .as_encoded_bytes()
                    .eq_ignore_ascii_case(super::resource::ENV_FILE.as_bytes());
                if !is_directory && is_env_file {
                    return Err(Error::Invalid(format!(
                        "{field} bind-mounts {} which contains .env at {}; the Sandbox would see its real values. \
                         Remove the file or keep it outside mounted directories",
                        source.display(),
                        entry.path().display(),
                    )));
                }
            }
        }
        Ok(())
    })
    .await
    .map_err(|error| Error::Daemon(format!("bind-mount .env inspection failed: {error}")))?
}

impl ControlPlane {
    /// Converts a stored record to its API representation, projecting
    /// provisioning progress and provenance into status.
    fn resource(&self, record: AgentRecord) -> Agent {
        let mut agent = record.agent;
        agent.status.progress = self.provisioning.summary(record.id);
        agent.status.provenance = Some(crate::Provenance {
            source_directory: record.source_directory,
            manifest_path: record.manifest_path,
            env_file: record.env_file,
        });
        agent
    }
}

fn validate_immutable_fields(current: &AgentRecord, desired: &Agent) -> Result<(), Error> {
    if current.agent.spec.sandbox.image != desired.spec.sandbox.image {
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
    if current.agent.spec.skills != desired.spec.skills {
        return Err(Error::Immutable("spec.skills"));
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

fn validate_request_paths(request: &ApplyRequest) -> Result<(), Error> {
    if !request.source_directory.is_absolute() {
        return Err(Error::Invalid("sourceDirectory must be absolute".into()));
    }
    if let Some(manifest) = &request.manifest_path
        && manifest.parent() != Some(request.source_directory.as_path())
    {
        return Err(Error::Invalid(
            "manifestPath must name a file in sourceDirectory".into(),
        ));
    }
    if let Some(env_file) = &request.env_file
        && !env_file.is_absolute()
    {
        return Err(Error::Invalid("envFile must be absolute".into()));
    }
    Ok(())
}

fn bind_mount_sources(agent: &Agent) -> Vec<(String, PathBuf)> {
    agent
        .spec
        .sandbox
        .mounts
        .iter()
        .enumerate()
        .filter_map(|(index, mount)| match mount {
            MountSpec::Bind { source, .. } => Some((format!("spec.sandbox.mounts[{index}]"), source.clone())),
            MountSpec::Tmpfs { .. } => None,
        })
        .collect()
}

async fn canonical_or_original(path: &std::path::Path) -> PathBuf {
    tokio::fs::canonicalize(path)
        .await
        .unwrap_or_else(|_| path.to_path_buf())
}

/// Canonical form of a secret file for comparison against canonical bind mount sources.
///
/// The file, and any number of its parent directories, may not exist yet. The nearest existing
/// ancestor is canonicalized and the missing components appended, so a symlink anywhere above
/// the file still compares equal to the resolved mount source.
async fn canonical_secret_file(path: &std::path::Path) -> PathBuf {
    let mut missing = Vec::new();
    let mut ancestor = path;
    loop {
        if let Ok(canonical) = tokio::fs::canonicalize(ancestor).await {
            return missing
                .iter()
                .rev()
                .fold(canonical, |joined, component| joined.join(component));
        }
        match (ancestor.parent(), ancestor.file_name()) {
            (Some(parent), Some(name)) => {
                missing.push(name);
                ancestor = parent;
            }
            _ => return path.to_path_buf(),
        }
    }
}

fn association_directories(record: &AgentRecord) -> impl Iterator<Item = &std::path::Path> {
    std::iter::once(record.source_directory.as_path()).chain(record.agent.spec.sandbox.mounts.iter().filter_map(
        |mount| match mount {
            MountSpec::Bind { source, .. } => Some(source.as_path()),
            MountSpec::Tmpfs { .. } => None,
        },
    ))
}
