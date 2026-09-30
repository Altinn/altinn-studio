//! The Microsandbox image cache of one Provider home.
//!
//! Microsandbox keeps an image version while any catalog entry names it, and
//! `Image::remove_local` removes the version with its last entry: its manifest, the layers no
//! other version shares and its root filesystem artifacts. It refuses while a runtime uses the
//! image. Everything that holds an image is therefore a catalog entry:
//!
//! - A Sandbox entry per Sandbox record, added when the record is created and removed when the
//!   Sandbox is deleted, so an image stays while a Sandbox uses it, with or without a runtime.
//! - A cache entry per image version, named by its digest or build, which resolving or
//!   importing the image refreshes, and which deleting a Sandbox that used it refreshes too. A
//!   removal pass removes it once it has not been refreshed for the retention period.
//!
//! Microsandbox applies each removal atomically, so removing an entry never needs to know what
//! else holds its image. Only removal passes remove the last entry of a version, and so delete
//! files; they run exclusively of image fetches, which may reuse those files.

use std::{
    collections::HashSet,
    future::Future,
    path::PathBuf,
    rc::Rc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use microsandbox_image::{CachedImageMetadata, GlobalCache, Reference};
use sandbox::{Error, SandboxId};
use tokio::sync::RwLock;

use crate::{
    client::Client,
    error,
    state::{SandboxRecord, StateStore},
};

/// The shortest retention period. A cache entry must outlive the time between resolving an
/// image and creating the Sandbox that holds it.
pub(crate) const MINIMUM_RETENTION: Duration = Duration::from_hours(1);

/// Directory below the Microsandbox cache for this crate's image and build-context archives.
/// Microsandbox stages its own downloads in the parent directory.
const SCRATCH_DIRECTORY: &str = "tmp/sandbox-microsandbox";

/// Repository of Sandbox entries, tagged with the Sandbox ID. Nothing pulls it: runtimes are
/// created from the cache only.
const SANDBOX_REPOSITORY: &str = "sandbox-microsandbox-sandbox";

/// Repository of cache entries that deleting a Sandbox writes for its image, by digest.
const RELEASED_REPOSITORY: &str = "sandbox-microsandbox-released";

/// Marks a home whose catalog, from before Sandbox entries, has been migrated.
const MIGRATED_MARKER: &str = "image-catalog-v2";

/// The Microsandbox image cache of one Provider home.
#[derive(Clone)]
pub(crate) struct ImageCache {
    client: Client,
    state: StateStore,
    /// Removes unused images when set. Unset leaves the cache to its owner.
    retention: Option<Duration>,
    /// Shared while an image is fetched and recorded, held exclusively by a removal pass. A
    /// fetch reuses cached layers that the catalog does not yet attribute to the new version.
    catalog: Rc<RwLock<()>>,
}

impl ImageCache {
    pub(crate) fn new(client: Client, state: StateStore, retention: Option<Duration>) -> Self {
        Self {
            client,
            state,
            retention,
            catalog: Rc::new(RwLock::new(())),
        }
    }

    /// Fetches an image and records it in the catalog under the name the fetch returns, which
    /// marks it used. Removal passes wait for the fetch.
    pub(crate) async fn record<T>(
        &self,
        fetch: impl Future<Output = Result<(String, CachedImageMetadata, T), Error>>,
    ) -> Result<(String, T), Error> {
        let _recording = self.catalog.read().await;
        let (name, metadata, fetched) = fetch.await?;
        self.write_entry(&name, metadata).await?;
        Ok((name, fetched))
    }

    /// Adds the entry that keeps a Sandbox's image while the Sandbox exists, and returns its
    /// name, or `None` when the image is not in the cache. Adding it again changes nothing.
    pub(crate) async fn hold(&self, record: &SandboxRecord) -> Result<Option<String>, Error> {
        let name = sandbox_entry(&record.id);
        let manifest_digest = record.image.manifest_digest.as_str();
        let _recording = self.catalog.read().await;
        match microsandbox::Image::get_local(self.client.local(), &name).await {
            Ok(entry) if entry.manifest_digest() == Some(manifest_digest) => return Ok(Some(name)),
            Ok(_) | Err(microsandbox::MicrosandboxError::ImageNotFound(_)) => {}
            Err(failure) => return Err(error::microsandbox(failure)),
        }
        let Some(metadata) = self.cached_metadata(manifest_digest).await? else {
            return Ok(None);
        };
        self.write_entry(&name, metadata).await?;
        Ok(Some(name))
    }

    /// Releases a deleted Sandbox's image. A fresh cache entry takes over from the Sandbox's
    /// entry, so the image stays for the retention period after the deletion and a removal
    /// pass removes it after that. An entry this leaves behind goes with the next pass.
    pub(crate) async fn release(&self, record: &SandboxRecord) {
        let manifest_digest = record.image.manifest_digest.as_str();
        let taken_over = {
            let _recording = self.catalog.read().await;
            match self.cached_metadata(manifest_digest).await {
                Ok(Some(metadata)) => self.write_entry(&released_entry(manifest_digest), metadata).await,
                Ok(None) => Ok(()),
                Err(error) => Err(error),
            }
        };
        if let Err(error) = taken_over {
            tracing::warn!(sandbox = %record.id, %error, "failed to keep a deleted Sandbox's image");
            return;
        }
        let name = sandbox_entry(&record.id);
        match microsandbox::Image::remove_local(self.client.local(), &name, false).await {
            // Another Sandbox's runtime still uses the image.
            Ok(())
            | Err(microsandbox::MicrosandboxError::ImageNotFound(_) | microsandbox::MicrosandboxError::ImageInUse(_)) =>
                {}
            Err(failure) => tracing::warn!(entry = name, error = %failure, "failed to release a Sandbox's image"),
        }
    }

    /// Removes cache entries not used for the retention period, and entries of Sandboxes
    /// whose record is gone.
    ///
    /// Removal is best-effort and never fails the caller. A pass is skipped while an image is
    /// fetched or another pass runs; later operations run passes of their own.
    pub(crate) async fn remove_unused(&self) {
        let Some(retention) = self.retention else {
            return;
        };
        let Ok(_exclusive) = self.catalog.try_write() else {
            return;
        };
        if let Err(error) = self.remove_unused_at(SystemTime::now(), retention).await {
            tracing::warn!(%error, "failed to remove unused Microsandbox images");
        }
        self.remove_stale_scratch(retention).await;
    }

    async fn remove_unused_at(&self, now: SystemTime, retention: Duration) -> Result<(), Error> {
        let sandboxes: HashSet<String> = self
            .state
            .sandbox_records()
            .await?
            .iter()
            .map(|record| entry_tag(&record.id))
            .collect();
        let now = unix_millis(now);
        for image in microsandbox::Image::list_local(self.client.local())
            .await
            .map_err(error::microsandbox)?
        {
            let last_used = image
                .last_used_at()
                .or_else(|| image.created_at())
                .map(|time| time.timestamp_millis());
            let unused = sandbox_entry_tag(image.reference())
                .map_or_else(|| is_expired(last_used, now, retention), |tag| !sandboxes.contains(tag));
            if !unused {
                continue;
            }
            match microsandbox::Image::remove_local(self.client.local(), image.reference(), false).await {
                Ok(()) => tracing::info!(reference = image.reference(), "removed unused Microsandbox image entry"),
                // A runtime still uses the image, or the entry is already gone.
                Err(
                    microsandbox::MicrosandboxError::ImageInUse(_) | microsandbox::MicrosandboxError::ImageNotFound(_),
                ) => {}
                Err(failure) => tracing::warn!(
                    reference = image.reference(),
                    error = %failure,
                    "failed to remove unused Microsandbox image entry"
                ),
            }
        }
        Ok(())
    }

    /// Reports whether this home's catalog is from before Sandboxes held their images.
    pub(crate) async fn migration_pending(&self) -> bool {
        !tokio::fs::try_exists(self.state.marker(MIGRATED_MARKER))
            .await
            .unwrap_or(false)
    }

    /// Completes the migration of a catalog from before Sandboxes held their images, once every
    /// Sandbox holds its image. Image versions no entry names, which a moved tag left behind,
    /// are reachable only through Microsandbox's prune, which also removes every entry of an
    /// image no runtime uses. It therefore runs once, while the Provider opens and before any
    /// Sandbox is created.
    pub(crate) async fn finish_migration(&self) -> Result<(), Error> {
        let report = microsandbox::Image::prune_local(self.client.local())
            .await
            .map_err(error::microsandbox)?;
        tracing::info!(
            manifests = report.manifests_removed,
            layers = report.layers_removed,
            "migrated the Microsandbox image catalog"
        );
        // Earlier releases staged archives in the parent of the scratch directory.
        if let Some(legacy_scratch) = self.scratch_directory().parent()
            && let Ok(mut entries) = tokio::fs::read_dir(legacy_scratch).await
        {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let archive = entry.file_name().to_string_lossy().starts_with(".tmp");
                if archive && entry.file_type().await.is_ok_and(|kind| kind.is_file()) {
                    let _ = tokio::fs::remove_file(entry.path()).await;
                }
            }
        }
        tokio::fs::write(self.state.marker(MIGRATED_MARKER), b"")
            .await
            .map_err(|source| error::io("record the Microsandbox image catalog migration", source))
    }

    /// Returns the cached metadata of an image version from any catalog entry that names it.
    async fn cached_metadata(&self, manifest_digest: &str) -> Result<Option<CachedImageMetadata>, Error> {
        let cache = self.global_cache()?;
        for image in microsandbox::Image::list_local(self.client.local())
            .await
            .map_err(error::microsandbox)?
        {
            if image.manifest_digest() != Some(manifest_digest) {
                continue;
            }
            let Ok(reference) = image.reference().parse::<Reference>() else {
                continue;
            };
            // A tag recorded before images were recorded by digest may have moved on.
            if let Some(metadata) = cache.read_image_metadata(&reference).map_err(error::backend)?
                && metadata.manifest_digest == manifest_digest
            {
                return Ok(Some(metadata));
            }
        }
        Ok(None)
    }

    async fn write_entry(&self, name: &str, metadata: CachedImageMetadata) -> Result<(), Error> {
        let reference = name.parse::<Reference>().map_err(error::backend)?;
        self.global_cache()?
            .write_image_metadata_async(&reference, &metadata)
            .await
            .map_err(error::backend)?;
        microsandbox::Image::persist(self.client.local(), name, metadata)
            .await
            .map_err(error::microsandbox)?;
        Ok(())
    }

    fn global_cache(&self) -> Result<GlobalCache, Error> {
        GlobalCache::new(&self.client.local().cache_dir()).map_err(error::backend)
    }

    /// Removes archives an interrupted image build left in this crate's scratch directory.
    async fn remove_stale_scratch(&self, retention: Duration) {
        let scratch = self.scratch_directory();
        let Ok(mut entries) = tokio::fs::read_dir(&scratch).await else {
            return;
        };
        let now = SystemTime::now();
        while let Ok(Some(entry)) = entries.next_entry().await {
            let Ok(metadata) = entry.metadata().await else {
                continue;
            };
            let stale = metadata
                .modified()
                .ok()
                .and_then(|modified| now.duration_since(modified).ok())
                .is_some_and(|age| age >= retention);
            if metadata.is_file()
                && stale
                && let Err(error) = tokio::fs::remove_file(entry.path()).await
            {
                tracing::warn!(path = %entry.path().display(), %error, "failed to remove stale image archive");
            }
        }
    }

    pub(crate) fn scratch_directory(&self) -> PathBuf {
        self.client.local().cache_dir().join(SCRATCH_DIRECTORY)
    }
}

fn entry_tag(id: &SandboxId) -> String {
    id.as_uuid().simple().to_string()
}

/// Returns the catalog name of a Sandbox's entry.
fn sandbox_entry(id: &SandboxId) -> String {
    format!("{SANDBOX_REPOSITORY}:{}", entry_tag(id))
}

/// Returns the catalog name of the cache entry that takes over a deleted Sandbox's image.
fn released_entry(manifest_digest: &str) -> String {
    format!("{RELEASED_REPOSITORY}@{manifest_digest}")
}

/// Returns the Sandbox ID tag of a Sandbox entry, or `None` for any other catalog entry.
fn sandbox_entry_tag(reference: &str) -> Option<&str> {
    let (repository, tag) = reference.rsplit_once(':')?;
    (repository == SANDBOX_REPOSITORY).then_some(tag)
}

/// Reports whether a cache entry has not been used for the retention period. An entry without
/// a recorded use has expired.
fn is_expired(last_used_millis: Option<i64>, now_millis: i64, retention: Duration) -> bool {
    let retention = i64::try_from(retention.as_millis()).unwrap_or(i64::MAX);
    last_used_millis.is_none_or(|used| now_millis.saturating_sub(used) >= retention)
}

fn unix_millis(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|elapsed| i64::try_from(elapsed.as_millis()).ok())
        .unwrap_or_default()
}

#[cfg(test)]
// Test Clients live for the whole test; tightening their drop adds nothing.
#[allow(clippy::expect_used, clippy::significant_drop_tightening)]
mod tests {
    use std::{
        collections::BTreeMap,
        path::PathBuf,
        time::{Duration, SystemTime},
    };

    use sandbox::{ByteQuantity, CpuQuantity, Hostname, Platform, RootFilesystem, SandboxName, SandboxResources};

    use super::{ImageCache, MIGRATED_MARKER, is_expired, released_entry, sandbox_entry, sandbox_entry_tag};
    use crate::{
        client::Client,
        state::{SandboxRecord, StateStore},
    };

    const DAY: Duration = Duration::from_hours(24);

    struct Home {
        directory: tempfile::TempDir,
        client: Client,
        state: StateStore,
    }

    impl Home {
        async fn open() -> Self {
            let directory = tempfile::tempdir().expect("temporary home should be created");
            let client = Client::open(directory.path().join("runtime"), None, None)
                .await
                .expect("Client should open");
            let state = StateStore::open(directory.path().join("state"))
                .await
                .expect("state store should open");
            Self {
                directory,
                client,
                state,
            }
        }

        fn images(&self) -> ImageCache {
            ImageCache::new(self.client.clone(), self.state.clone(), Some(DAY))
        }

        fn path(&self) -> &std::path::Path {
            self.directory.path()
        }

        /// Records a cache entry the way resolving an image does.
        async fn resolve(&self, images: &ImageCache, name: &str, manifest_digest: &str) {
            images
                .record(async { Ok((name.to_string(), metadata(manifest_digest), ())) })
                .await
                .expect("image should be recorded");
        }

        /// Records a catalog entry the way releases before Sandbox entries did.
        async fn record_legacy(&self, name: &str, manifest_digest: &str) {
            microsandbox::Image::persist(self.client.local(), name, metadata(manifest_digest))
                .await
                .expect("image should be recorded");
            microsandbox_image::GlobalCache::new(&self.client.local().cache_dir())
                .expect("image cache should open")
                .write_image_metadata_async(&name.parse().expect("reference"), &metadata(manifest_digest))
                .await
                .expect("image metadata should be written");
        }

        /// Stands in for the files Microsandbox materializes for an image version.
        fn materialize(&self, manifest_digest: &str) -> PathBuf {
            let path = microsandbox_image::GlobalCache::new(&self.client.local().cache_dir())
                .expect("image cache should open")
                .fsmeta_erofs_path(&manifest_digest.parse().expect("digest should parse"));
            std::fs::create_dir_all(path.parent().expect("fsmeta directory")).expect("fsmeta directory");
            std::fs::write(&path, b"fsmeta").expect("fsmeta file");
            path
        }

        async fn sandbox_needing(&self, manifest_digest: &str) -> SandboxRecord {
            let record = sandbox_record("00000000-0000-4000-8000-000000000001", manifest_digest);
            self.state
                .save_sandbox(&record)
                .await
                .expect("Sandbox record should be saved");
            record
        }

        async fn references(&self) -> Vec<String> {
            let mut references: Vec<String> = microsandbox::Image::list_local(self.client.local())
                .await
                .expect("images should list")
                .iter()
                .map(|image| image.reference().to_string())
                .collect();
            references.sort();
            references
        }
    }

    fn metadata(manifest_digest: &str) -> microsandbox_image::CachedImageMetadata {
        microsandbox_image::CachedImageMetadata {
            manifest_digest: manifest_digest.to_string(),
            config_digest: digest('c'),
            raw_manifest_json: "{}".to_string(),
            raw_config_json: "{}".to_string(),
            config: microsandbox_image::ImageConfig::default(),
            layers: Vec::new(),
        }
    }

    fn sandbox_record(id: &str, manifest_digest: &str) -> SandboxRecord {
        SandboxRecord::new(sandbox::backend::CreateSandboxRequest {
            id: id.parse().expect("Sandbox ID"),
            name: SandboxName::new("worker").expect("Sandbox name"),
            hostname: Hostname::new("worker").expect("hostname"),
            image: sandbox::image::ResolvedImage {
                source: sandbox::image::ImageSource::Reference {
                    reference: "example.com/app:latest".to_string(),
                },
                platform: Platform::new("linux", "amd64"),
                manifest_digest: manifest_digest.to_string(),
            },
            resources: SandboxResources::new(
                "1".parse::<CpuQuantity>().expect("CPU"),
                "512Mi".parse::<ByteQuantity>().expect("memory"),
                RootFilesystem::layered("1Gi".parse::<ByteQuantity>().expect("root filesystem")),
            ),
            init_system: sandbox::init::InitSystem::Backend,
            mounts: Vec::new(),
            environment: BTreeMap::new(),
            network: None,
        })
    }

    fn digest(fill: char) -> String {
        format!("sha256:{}", fill.to_string().repeat(64))
    }

    #[test]
    fn cache_entries_expire_once_unused_for_the_retention_period() {
        let hour = 60 * 60 * 1000;
        let now = 1000 * hour;
        assert!(!is_expired(Some(now - 23 * hour), now, DAY));
        assert!(is_expired(Some(now - 24 * hour), now, DAY));
        assert!(!is_expired(Some(now + 1), now, DAY), "a use after now keeps the entry");
        assert!(is_expired(None, now, DAY));
    }

    #[test]
    fn only_sandbox_entries_carry_a_sandbox_tag() {
        let id = "00000000-0000-4000-8000-0000000000ab".parse().expect("Sandbox ID");
        assert_eq!(
            sandbox_entry_tag(&sandbox_entry(&id)),
            Some("000000000000400080000000000000ab")
        );
        assert_eq!(sandbox_entry_tag("example.com/app@sha256:1234"), None);
        assert_eq!(sandbox_entry_tag("example.com/app:latest"), None);
        assert_eq!(sandbox_entry_tag("sandbox-microsandbox-import:docker-1234"), None);
    }

    #[tokio::test(flavor = "local")]
    async fn a_deleted_sandboxs_image_stays_for_the_retention_period_after_the_deletion() {
        let home = Home::open().await;
        let images = home.images();
        let image = digest('a');
        home.resolve(&images, &format!("example.com/app@{image}"), &image).await;
        let files = home.materialize(&image);
        let record = home.sandbox_needing(&image).await;
        let entry = images
            .hold(&record)
            .await
            .expect("hold")
            .expect("the image should be cached");
        assert_eq!(images.hold(&record).await.expect("hold again"), Some(entry.clone()));

        // The Sandbox outlives the image's cache entry.
        images
            .remove_unused_at(SystemTime::now() + 2 * DAY, DAY)
            .await
            .expect("pass");
        assert_eq!(home.references().await, [entry]);

        home.state.remove_sandbox(&record).await.expect("record removed");
        images.release(&record).await;
        assert_eq!(home.references().await, [released_entry(&image)]);
        images
            .remove_unused_at(SystemTime::now() + Duration::from_hours(23), DAY)
            .await
            .expect("pass");
        assert!(
            files.exists(),
            "the image stays for the retention period after the deletion"
        );
        images
            .remove_unused_at(SystemTime::now() + Duration::from_hours(25), DAY)
            .await
            .expect("pass");
        assert!(home.references().await.is_empty());
        assert!(!files.exists(), "the image goes with its last entry");
    }

    #[tokio::test(flavor = "local")]
    async fn a_cache_entry_is_kept_for_the_retention_period() {
        let home = Home::open().await;
        let images = home.images();
        let image = digest('a');
        home.resolve(&images, &format!("example.com/app@{image}"), &image).await;

        images
            .remove_unused_at(SystemTime::now() + Duration::from_hours(23), DAY)
            .await
            .expect("pass");
        assert_eq!(home.references().await.len(), 1);
        images
            .remove_unused_at(SystemTime::now() + Duration::from_hours(25), DAY)
            .await
            .expect("pass");
        assert!(home.references().await.is_empty());
    }

    #[tokio::test(flavor = "local")]
    async fn an_entry_whose_sandbox_record_is_gone_is_removed() {
        let home = Home::open().await;
        let images = home.images();
        let image = digest('a');
        home.resolve(&images, &format!("example.com/app@{image}"), &image).await;
        let record = home.sandbox_needing(&image).await;
        let entry = images
            .hold(&record)
            .await
            .expect("hold")
            .expect("the image should be cached");
        home.state.remove_sandbox(&record).await.expect("record removed");

        images.remove_unused_at(SystemTime::now(), DAY).await.expect("pass");
        assert!(!home.references().await.contains(&entry));
    }

    #[tokio::test(flavor = "local")]
    async fn an_image_that_is_not_cached_cannot_be_held() {
        let home = Home::open().await;
        let images = home.images();
        let record = home.sandbox_needing(&digest('a')).await;
        assert_eq!(images.hold(&record).await.expect("hold"), None);
    }

    /// Records a tag the way releases before Sandbox entries did, moved from a previous version
    /// to a current one, which leaves the previous version without an entry.
    async fn record_moved_tag(home: &Home) -> PathBuf {
        let (previous, current) = (digest('a'), digest('b'));
        home.record_legacy("example.com/app:latest", &previous).await;
        home.record_legacy("example.com/app:latest", &current).await;
        home.materialize(&previous)
    }

    #[tokio::test(flavor = "local")]
    async fn finishing_the_migration_removes_what_nothing_holds_once() {
        let home = Home::open().await;
        let previous_files = record_moved_tag(&home).await;
        let legacy_scratch = home.client.local().cache_dir().join("tmp");
        std::fs::create_dir_all(&legacy_scratch).expect("legacy scratch directory");
        std::fs::write(legacy_scratch.join(".tmpArchive"), b"archive").expect("legacy archive");
        let images = home.images();
        assert!(images.migration_pending().await);

        images.finish_migration().await.expect("migration");
        assert!(!previous_files.exists());
        assert!(!legacy_scratch.join(".tmpArchive").exists());
        assert!(!images.migration_pending().await);
        assert!(home.state.marker(MIGRATED_MARKER).exists());
    }

    #[tokio::test(flavor = "local")]
    async fn opening_a_provider_migrates_a_home_from_before_sandboxes_held_their_images() {
        let home = Home::open().await;
        let previous_files = record_moved_tag(&home).await;

        provider(home.path()).await;
        assert!(!previous_files.exists());
        assert!(home.state.marker(MIGRATED_MARKER).exists());
    }

    #[tokio::test(flavor = "local")]
    async fn migration_waits_while_a_sandbox_cannot_hold_its_image() {
        let home = Home::open().await;
        let previous_files = record_moved_tag(&home).await;
        let mut record = sandbox_record("00000000-0000-4000-8000-000000000002", &digest('d'));
        record.image.source = sandbox::image::ImageSource::Reference {
            reference: "registry.invalid/app:latest".to_string(),
        };
        home.state.save_sandbox(&record).await.expect("record saved");

        provider(home.path()).await;
        assert!(
            previous_files.exists(),
            "nothing is removed before every Sandbox holds its image"
        );
        assert!(
            !home.state.marker(MIGRATED_MARKER).exists(),
            "the next open tries again"
        );
    }

    #[tokio::test(flavor = "local")]
    #[ignore = "requires Internet access"]
    async fn a_sandbox_fetches_an_image_the_cache_lost_by_digest() {
        let manifest_digest = match std::env::consts::ARCH {
            "x86_64" => "sha256:7c8cb692ae09657cbc4a3f3cbd0e8d5a2690ba38386aaaf252dbb060bf5eb2e6",
            "aarch64" => "sha256:2c9d26f410d032d5b1525aa8a873e238b05b90c4ae8618743d4311f0cc827e37",
            _ => return,
        };
        let home = Home::open().await;
        let provider = provider(home.path()).await;
        let mut record = sandbox_record("00000000-0000-4000-8000-000000000003", manifest_digest);
        record.image.source = sandbox::image::ImageSource::Reference {
            reference: "docker.io/library/alpine:3.22".to_string(),
        };
        record.image.platform = native_platform();
        home.state.save_sandbox(&record).await.expect("record saved");

        let entry = provider.hold_image(&record).await.expect("the image should be fetched");
        assert_eq!(entry, sandbox_entry(&record.id));
        assert!(
            home.references()
                .await
                .contains(&format!("docker.io/library/alpine@{manifest_digest}"))
        );
    }

    #[tokio::test(flavor = "local")]
    async fn without_a_retention_period_the_cache_is_left_alone() {
        let home = Home::open().await;
        let image = digest('a');
        home.record_legacy(&format!("example.com/app@{image}"), &image).await;

        ImageCache::new(home.client.clone(), home.state.clone(), None)
            .remove_unused()
            .await;
        assert_eq!(home.references().await.len(), 1);
    }

    fn native_platform() -> Platform {
        Platform::native("linux")
    }

    fn vm_resources(mode: sandbox::RootFilesystemMode) -> SandboxResources {
        let capacity = "1Gi".parse::<ByteQuantity>().expect("root filesystem");
        SandboxResources::new(
            "1".parse::<CpuQuantity>().expect("CPU"),
            "512Mi".parse::<ByteQuantity>().expect("memory"),
            match mode {
                sandbox::RootFilesystemMode::Direct => RootFilesystem::direct(capacity),
                _ => RootFilesystem::layered(capacity),
            },
        )
    }

    fn ensure_request(name: &str, reference: &str, mode: sandbox::RootFilesystemMode) -> sandbox::EnsureSandboxRequest {
        sandbox::EnsureSandboxRequest::new(
            SandboxName::new(name).expect("Sandbox name"),
            sandbox::SandboxSpec {
                image: sandbox::image::ImageSource::Reference {
                    reference: reference.to_string(),
                },
                platform: native_platform(),
                resources: vm_resources(mode),
                init_system: sandbox::init::InitSystem::Backend,
                retention_policy: sandbox::RetentionPolicy::Retain,
            },
        )
    }

    /// Creates a Sandbox without starting it, as when its first start fails.
    async fn create_unstarted(
        provider: &crate::MicrosandboxProvider,
        id: &str,
        image: sandbox::image::ResolvedImage,
        mode: sandbox::RootFilesystemMode,
    ) -> sandbox::Sandbox {
        use sandbox::backend::SandboxBackend as _;

        provider
            .create(sandbox::backend::CreateSandboxRequest {
                id: id.parse().expect("Sandbox ID"),
                image,
                name: SandboxName::new(format!("unstarted-{}", &id[id.len() - 4..])).expect("Sandbox name"),
                hostname: Hostname::new("unstarted").expect("hostname"),
                resources: vm_resources(mode),
                init_system: sandbox::init::InitSystem::Backend,
                mounts: Vec::new(),
                environment: BTreeMap::new(),
                network: None,
            })
            .await
            .expect("Sandbox should be created")
    }

    async fn resolve_image(
        provider: &crate::MicrosandboxProvider,
        reference: &str,
        mode: sandbox::RootFilesystemMode,
    ) -> sandbox::image::ResolvedImage {
        use sandbox::provider::SandboxProvider as _;

        provider
            .image_backend()
            .resolve(&sandbox::image::ResolveRequest {
                source: sandbox::image::ImageSource::Reference {
                    reference: reference.to_string(),
                },
                platform: native_platform(),
                root_filesystem_mode: mode,
            })
            .await
            .expect("image should resolve")
    }

    /// Lists the cached artifacts in a directory, ignoring lock files.
    fn cached_files(directory: &std::path::Path) -> Vec<PathBuf> {
        std::fs::read_dir(directory).map_or_else(
            |_| Vec::new(),
            |entries| {
                entries
                    .map(|entry| entry.expect("cache entry should be readable").path())
                    .filter(|path| path.extension().is_none_or(|extension| extension != "lock"))
                    .collect()
            },
        )
    }

    async fn provider(home: &std::path::Path) -> std::rc::Rc<crate::MicrosandboxProvider> {
        std::rc::Rc::new(
            crate::MicrosandboxProvider::builder(home)
                .remove_unused_images_after(DAY)
                .open()
                .await
                .expect("Provider should open"),
        )
    }

    #[tokio::test(flavor = "local")]
    #[ignore = "requires a Microsandbox host runtime, hardware virtualization and registry access"]
    async fn sandboxes_keep_their_images_until_they_are_deleted() {
        use sandbox::{
            RootFilesystemMode::{Direct, Layered},
            backend::SandboxBackend as _,
        };

        let home = tempfile::tempdir().expect("temporary home should be created");
        let provider = provider(home.path()).await;
        let service = sandbox::SandboxService::new(provider.clone());
        let later = || SystemTime::now() + 2 * DAY;

        let stopped = service
            .ensure(&ensure_request("stopped", "docker.io/library/alpine:3.21", Layered))
            .await
            .expect("layered Sandbox should start")
            .snapshot()
            .clone();
        provider.stop(&stopped.id).await.expect("Sandbox should stop");
        let unstarted_image = resolve_image(&provider, "docker.io/library/alpine:3.20", Direct).await;
        let unstarted = create_unstarted(
            &provider,
            "00000000-0000-4000-8000-0000000020d4",
            unstarted_image,
            Direct,
        )
        .await;
        let deleted = service
            .ensure(&ensure_request("deleted", "docker.io/library/alpine:3.22", Direct))
            .await
            .expect("direct Sandbox should start")
            .snapshot()
            .clone();
        service.delete(&deleted.name).await.expect("Sandbox should be deleted");
        provider.images().remove_unused_at(later(), DAY).await.expect("pass");

        let cache = home.path().join("runtime/cache");
        let flat_ref = |manifest_digest: &str| {
            cache
                .join("flat/refs")
                .join(format!("{}.json", manifest_digest.replace(':', "_")))
        };
        assert!(
            !flat_ref(&deleted.image.manifest_digest).exists(),
            "the deleted Sandbox's image should be removed once unused for the retention period"
        );
        assert!(flat_ref(&unstarted.image.manifest_digest).exists());

        provider
            .start(&stopped.id)
            .await
            .expect("the stopped Sandbox should keep its image and restart");
        provider
            .start(&unstarted.id)
            .await
            .expect("the Sandbox without a runtime should keep its image and start");
        for sandbox in [&stopped, &unstarted] {
            service.delete(&sandbox.name).await.expect("Sandbox should be deleted");
        }
        provider.images().remove_unused_at(later(), DAY).await.expect("pass");
        for directory in ["flat/blobs", "flat/refs", "layers", "fsmeta", "vmdk"] {
            assert_eq!(
                cached_files(&cache.join(directory)),
                Vec::<PathBuf>::new(),
                "no image should remain in {directory} once no Sandbox needs one"
            );
        }
    }

    #[tokio::test(flavor = "local")]
    #[ignore = "requires a Microsandbox host runtime, hardware virtualization and registry access"]
    async fn a_removal_pass_while_a_sandbox_boots_keeps_its_image() {
        use sandbox::{RootFilesystemMode::Layered, backend::SandboxBackend as _};

        let home = tempfile::tempdir().expect("temporary home should be created");
        let provider = provider(home.path()).await;
        let service = sandbox::SandboxService::new(provider.clone());
        let request = ensure_request("booting", "docker.io/library/alpine:3.21", Layered);
        let vmdk = home.path().join("runtime/cache/vmdk");
        let boot = async { service.ensure(&request).await.map(|handle| handle.snapshot().clone()) };
        // Microsandbox reports the runtime before it records that the runtime uses its image.
        // Another Agent resolves the same image while the first boots, and a pass runs days
        // later, when that resolve's cache entry has expired.
        let resolve_while_booting = async {
            while !provider
                .find(request.name())
                .await
                .is_ok_and(|sandbox| sandbox.state == sandbox::SandboxState::Running)
            {
                tokio::time::sleep(Duration::from_millis(5)).await;
            }
            let manifest_digest = cached_files(&vmdk)[0]
                .file_stem()
                .and_then(|stem| stem.to_str())
                .expect("VMDK should be named by its manifest digest")
                .replacen('_', ":", 1);
            let resolved = resolve_image(
                &provider,
                &format!("docker.io/library/alpine@{manifest_digest}"),
                Layered,
            )
            .await;
            provider
                .images()
                .remove_unused_at(SystemTime::now() + 2 * DAY, DAY)
                .await
                .expect("pass");
            resolved
        };
        let (booted, resolved) = tokio::join!(boot, resolve_while_booting);
        let booted = booted.expect("Sandbox should start");

        provider.stop(&booted.id).await.expect("Sandbox should stop");
        provider
            .start(&booted.id)
            .await
            .expect("the Sandbox that was booting should keep its image and restart");
        let second = create_unstarted(&provider, "00000000-0000-4000-8000-0000000020d5", resolved, Layered).await;
        for sandbox in [&booted, &second] {
            service.delete(&sandbox.name).await.expect("Sandbox should be deleted");
        }
    }
}
