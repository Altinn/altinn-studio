use std::{collections::BTreeMap, io::Write as _, path::PathBuf};

use sandbox::{
    SandboxId, SandboxName, SandboxResources, backend::CreateSandboxRequest, image::ResolvedImage, init::InitSystem,
    mount::Mount, network::NetworkAttachment, volume::VolumeId,
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use sha2::{Digest as _, Sha256};

use crate::{encoding::lower_hex, error};

const SANDBOX_SCHEMA_VERSION: u32 = 4;
const VOLUME_SCHEMA_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct SandboxRecord {
    schema_version: u32,
    pub(crate) id: SandboxId,
    pub(crate) runtime_name: String,
    pub(crate) name: SandboxName,
    pub(crate) image: ResolvedImage,
    pub(crate) resources: SandboxResources,
    #[serde(default)]
    pub(crate) init_system: InitSystem,
    pub(crate) mounts: Vec<Mount>,
    pub(crate) environment: BTreeMap<String, String>,
    pub(crate) network: Option<NetworkAttachment>,
}

impl SandboxRecord {
    pub(crate) fn new(request: CreateSandboxRequest) -> Self {
        let runtime_name = format!("sandbox-{}", request.id.as_uuid().simple());
        Self {
            schema_version: SANDBOX_SCHEMA_VERSION,
            runtime_name,
            id: request.id,
            name: request.name,
            image: request.image,
            resources: request.resources,
            init_system: request.init_system,
            mounts: request.mounts,
            environment: request.environment,
            network: request.network,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct VolumeRecord {
    schema_version: u32,
    pub(crate) id: VolumeId,
    pub(crate) runtime_name: String,
    pub(crate) name: sandbox::volume::VolumeName,
}

impl VolumeRecord {
    pub(crate) fn new(id: VolumeId, name: sandbox::volume::VolumeName) -> Self {
        let runtime_name = format!("volume-{}", id.as_uuid().simple());
        Self {
            schema_version: VOLUME_SCHEMA_VERSION,
            runtime_name,
            id,
            name,
        }
    }
}

#[derive(Clone)]
pub(crate) struct StateStore {
    sandboxes: PathBuf,
    volumes: PathBuf,
}

impl StateStore {
    pub(crate) async fn open(home: PathBuf) -> Result<Self, sandbox::Error> {
        let store = Self {
            sandboxes: home.join("sandboxes"),
            volumes: home.join("volumes"),
        };
        for directory in [&store.sandboxes, &store.volumes] {
            tokio::fs::create_dir_all(directory)
                .await
                .map_err(|source| error::io("create Microsandbox state directory", source))?;
        }
        Ok(store)
    }

    pub(crate) async fn save_sandbox(&self, record: &SandboxRecord) -> Result<(), sandbox::Error> {
        write_new(self.sandbox_path(&record.name), record).await
    }

    pub(crate) async fn update_sandbox(&self, record: &SandboxRecord) -> Result<(), sandbox::Error> {
        write_replace(self.sandbox_path(&record.name), record).await
    }

    pub(crate) async fn sandbox_by_name(&self, name: &SandboxName) -> Result<SandboxRecord, sandbox::Error> {
        let record: SandboxRecord = read_record(
            self.sandbox_path(name),
            "read Microsandbox Sandbox state",
            sandbox::ResourceKind::Sandbox,
            name.to_string(),
        )
        .await?;
        validate_schema(record.schema_version, SANDBOX_SCHEMA_VERSION)?;
        Ok(record)
    }

    pub(crate) async fn sandbox_by_id(&self, id: &SandboxId) -> Result<SandboxRecord, sandbox::Error> {
        let record = scan_records(
            &self.sandboxes,
            sandbox::ResourceKind::Sandbox,
            id.to_string(),
            |record: &SandboxRecord| &record.id == id,
        )
        .await?;
        validate_schema(record.schema_version, SANDBOX_SCHEMA_VERSION)?;
        Ok(record)
    }

    pub(crate) async fn remove_sandbox(&self, record: &SandboxRecord) -> Result<(), sandbox::Error> {
        remove_file(self.sandbox_path(&record.name), "remove Microsandbox Sandbox state").await
    }

    pub(crate) async fn save_volume(&self, record: &VolumeRecord) -> Result<(), sandbox::Error> {
        write_new(self.volume_path(&record.name), record).await
    }

    pub(crate) async fn volume_by_name(
        &self,
        name: &sandbox::volume::VolumeName,
    ) -> Result<VolumeRecord, sandbox::Error> {
        let record: VolumeRecord = read_record(
            self.volume_path(name),
            "read Microsandbox Volume state",
            sandbox::ResourceKind::Volume,
            name.to_string(),
        )
        .await?;
        validate_schema(record.schema_version, VOLUME_SCHEMA_VERSION)?;
        Ok(record)
    }

    pub(crate) async fn volume_by_id(&self, id: &VolumeId) -> Result<VolumeRecord, sandbox::Error> {
        let record = scan_records(
            &self.volumes,
            sandbox::ResourceKind::Volume,
            id.to_string(),
            |record: &VolumeRecord| record.id == *id,
        )
        .await?;
        validate_schema(record.schema_version, VOLUME_SCHEMA_VERSION)?;
        Ok(record)
    }

    pub(crate) async fn remove_volume(&self, record: &VolumeRecord) -> Result<(), sandbox::Error> {
        remove_file(self.volume_path(&record.name), "remove Microsandbox Volume state").await
    }

    fn sandbox_path(&self, name: &SandboxName) -> PathBuf {
        self.sandboxes.join(record_filename(name))
    }

    fn volume_path(&self, name: &sandbox::volume::VolumeName) -> PathBuf {
        self.volumes.join(record_filename(name))
    }
}

fn record_filename(name: impl AsRef<str>) -> String {
    format!("{}.json", lower_hex(&Sha256::digest(name.as_ref().as_bytes())))
}

fn validate_schema(version: u32, expected: u32) -> Result<(), sandbox::Error> {
    if version == expected {
        Ok(())
    } else {
        Err(sandbox::Error::Backend(format!(
            "unsupported Microsandbox state schema version {version}"
        )))
    }
}

async fn write_new<T>(path: PathBuf, value: &T) -> Result<(), sandbox::Error>
where
    T: Serialize + Send + Sync + 'static,
{
    write_record(path, value, false).await
}

async fn write_replace<T>(path: PathBuf, value: &T) -> Result<(), sandbox::Error>
where
    T: Serialize + Send + Sync + 'static,
{
    write_record(path, value, true).await
}

async fn write_record<T>(path: PathBuf, value: &T, replace: bool) -> Result<(), sandbox::Error>
where
    T: Serialize + Send + Sync + 'static,
{
    let serialized = serde_json::to_vec_pretty(value).map_err(error::backend)?;
    tokio::task::spawn_blocking(move || {
        let parent = path
            .parent()
            .ok_or_else(|| std::io::Error::other("state record has no parent directory"))?;
        let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
        temporary.write_all(&serialized)?;
        temporary.as_file().sync_all()?;
        if replace {
            temporary.persist(path).map_err(|failure| failure.error)?;
        } else {
            temporary.persist_noclobber(path).map_err(|failure| failure.error)?;
        }
        Ok::<(), std::io::Error>(())
    })
    .await
    .map_err(error::backend)?
    .map_err(|source| error::io("persist Microsandbox state", source))
}

async fn read_record<T>(
    path: PathBuf,
    operation: &'static str,
    resource: sandbox::ResourceKind,
    id: String,
) -> Result<T, sandbox::Error>
where
    T: DeserializeOwned,
{
    let contents = tokio::fs::read(path).await.map_err(|source| {
        if source.kind() == std::io::ErrorKind::NotFound {
            sandbox::Error::not_found(resource, &id)
        } else {
            error::io(operation, source)
        }
    })?;
    serde_json::from_slice(&contents).map_err(error::backend)
}

async fn scan_records<T>(
    directory: &PathBuf,
    resource: sandbox::ResourceKind,
    id: String,
    predicate: impl Fn(&T) -> bool,
) -> Result<T, sandbox::Error>
where
    T: DeserializeOwned,
{
    for record in read_records(directory, resource).await? {
        if predicate(&record) {
            return Ok(record);
        }
    }
    Err(sandbox::Error::not_found(resource, &id))
}

async fn read_records<T>(directory: &PathBuf, resource: sandbox::ResourceKind) -> Result<Vec<T>, sandbox::Error>
where
    T: DeserializeOwned,
{
    let mut entries = tokio::fs::read_dir(directory)
        .await
        .map_err(|source| error::io("list Microsandbox state", source))?;
    let mut records = Vec::new();
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|source| error::io("read Microsandbox state entry", source))?
    {
        let path = entry.path();
        records.push(
            read_record(
                path.clone(),
                "read Microsandbox state entry",
                resource,
                path.display().to_string(),
            )
            .await?,
        );
    }
    Ok(records)
}

async fn remove_file(path: PathBuf, operation: &'static str) -> Result<(), sandbox::Error> {
    tokio::fs::remove_file(path)
        .await
        .map_err(|source| error::io(operation, source))
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use std::{collections::BTreeMap, path::PathBuf};

    use sandbox::{
        ByteQuantity, CpuQuantity, Platform, RootFilesystem, SandboxName, SandboxResources,
        backend::CreateSandboxRequest, image, init::InitSystem,
    };

    use super::{SandboxRecord, StateStore, VolumeRecord};

    fn sandbox_id(value: &str) -> sandbox::SandboxId {
        value.parse().expect("test Sandbox ID should be a UUID")
    }

    fn image() -> image::ResolvedImage {
        image::ResolvedImage {
            source: image::ImageSource::Build {
                context: PathBuf::from("context"),
                dockerfile: PathBuf::from("Dockerfile"),
            },
            platform: Platform::new("linux", "amd64"),
            manifest_digest: "sha256:1234".to_string(),
        }
    }

    fn sandbox_name() -> SandboxName {
        SandboxName::new("worker").expect("test Sandbox name should be valid")
    }

    fn resources() -> SandboxResources {
        SandboxResources::new(
            "1".parse::<CpuQuantity>().expect("test CPU should be valid"),
            "512Mi".parse::<ByteQuantity>().expect("test memory should be valid"),
            RootFilesystem::layered(
                "4Gi"
                    .parse::<ByteQuantity>()
                    .expect("test root filesystem should be valid"),
            ),
        )
    }

    fn sandbox_record(id: &str) -> SandboxRecord {
        SandboxRecord::new(CreateSandboxRequest {
            id: sandbox_id(id),
            name: sandbox_name(),
            image: image(),
            resources: resources(),
            init_system: InitSystem::Backend,
            mounts: Vec::new(),
            environment: BTreeMap::new(),
            network: None,
        })
    }

    #[tokio::test(flavor = "local")]
    async fn sandbox_records_survive_reopening_the_store() {
        let home = tempfile::tempdir().expect("temporary state home should be created");
        let store = StateStore::open(home.path().to_path_buf())
            .await
            .expect("state store should open");
        let record = sandbox_record("00000000-0000-4000-8000-000000000001");
        store.save_sandbox(&record).await.expect("record should be saved");

        let reopened = StateStore::open(home.path().to_path_buf())
            .await
            .expect("state store should reopen");
        assert_eq!(
            reopened
                .sandbox_by_name(&sandbox_name())
                .await
                .expect("record should be found by name"),
            record
        );
        assert_eq!(
            reopened
                .sandbox_by_id(&record.id)
                .await
                .expect("record should be found by identifier"),
            record
        );
    }

    #[tokio::test(flavor = "local")]
    async fn saving_a_duplicate_name_does_not_replace_immutable_state() {
        let home = tempfile::tempdir().expect("temporary state home should be created");
        let store = StateStore::open(home.path().to_path_buf())
            .await
            .expect("state store should open");
        let original = sandbox_record("00000000-0000-4000-8000-000000000002");
        let replacement = sandbox_record("00000000-0000-4000-8000-000000000003");
        store.save_sandbox(&original).await.expect("record should be saved");

        assert!(store.save_sandbox(&replacement).await.is_err());
        assert_eq!(
            store
                .sandbox_by_name(&sandbox_name())
                .await
                .expect("original record should remain"),
            original
        );
    }

    #[tokio::test(flavor = "local")]
    async fn volume_records_are_addressable_by_name_and_identifier() {
        let home = tempfile::tempdir().expect("temporary state home should be created");
        let store = StateStore::open(home.path().to_path_buf())
            .await
            .expect("state store should open");
        let id = "00000000-0000-4000-8000-000000000004"
            .parse()
            .expect("test Volume identifier should be valid");
        let name = sandbox::volume::VolumeName::new("home").expect("test Volume name should be valid");
        let record = VolumeRecord::new(id, name.clone());
        store.save_volume(&record).await.expect("record should be saved");

        assert_eq!(
            store
                .volume_by_name(&name)
                .await
                .expect("record should be found by name"),
            record
        );
        assert_eq!(
            store
                .volume_by_id(&record.id)
                .await
                .expect("record should be found by identifier"),
            record
        );
    }
}
