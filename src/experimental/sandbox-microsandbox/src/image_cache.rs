//! The Microsandbox image cache of one Provider home.
//!
//! Microsandbox keeps an image version while any catalog entry names it, and
//! `Image::remove_local` removes the version with its last entry: its manifest, the layers no
//! other version shares and its root filesystem artifacts. It refuses while a runtime uses the
//! image. Everything that holds an image is therefore a catalog entry:
//!
//! - A Sandbox entry per Sandbox record, added when the record is created and removed when the
//!   Sandbox is deleted, so an image stays while a Sandbox uses it, with or without a runtime.
//! - A cache entry per image version, named by its digest, which resolving or importing the
//!   image refreshes, and which deleting a Sandbox that used it refreshes too. A removal pass
//!   removes it once it has not been refreshed for the retention period.
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

/// Repository of cache entries, pinned to the image version's manifest digest.
const CACHE_REPOSITORY: &str = "sandbox-microsandbox-cache";

/// Repository of the temporary entry that tells whether a runtime records using an image.
const PROBE_REPOSITORY: &str = "sandbox-microsandbox-probe";

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

    /// Fetches an image and records it in its cache entry, which marks it used, and returns the
    /// entry's name. Removal passes wait for the fetch, which may reuse cached layers that no
    /// entry attributes to the new version yet.
    pub(crate) async fn record<T>(
        &self,
        fetch: impl Future<Output = Result<(CachedImageMetadata, T), Error>>,
    ) -> Result<(String, T), Error> {
        let _recording = self.catalog.read().await;
        let (metadata, fetched) = fetch.await?;
        let name = cache_entry(&metadata.manifest_digest);
        self.write_entry(&name, metadata).await?;
        Ok((name, fetched))
    }

    /// Adds the entry that keeps a Sandbox's image while the Sandbox exists, and returns the
    /// name to create its runtime from, or `None` when the image is not in the cache. Adding it
    /// again changes nothing. Without a retention period nothing removes images, so no entry is
    /// added and any entry naming the image is returned.
    pub(crate) async fn hold(&self, record: &SandboxRecord) -> Result<Option<String>, Error> {
        let name = sandbox_entry(&record.id);
        let manifest_digest = record.image.manifest_digest.as_str();
        let _recording = self.catalog.read().await;
        let mut cached = None;
        for entry in microsandbox::Image::list_local(self.client.local())
            .await
            .map_err(error::microsandbox)?
        {
            if entry.manifest_digest() != Some(manifest_digest) {
                continue;
            }
            if entry.reference() == name {
                return Ok(Some(name));
            }
            // A tag recorded before images were recorded by digest may have moved on.
            if cached.is_none()
                && let Some(metadata) = self.metadata(entry.reference())?
                && metadata.manifest_digest == manifest_digest
            {
                cached = Some((entry.reference().to_string(), metadata));
            }
        }
        let Some((cached_name, metadata)) = cached else {
            return Ok(None);
        };
        if self.retention.is_none() {
            return Ok(Some(cached_name));
        }
        self.write_entry(&name, metadata).await?;
        Ok(Some(name))
    }

    /// Releases a deleted Sandbox's image. Its cache entry is refreshed before the Sandbox's
    /// entry goes, so the image stays for the retention period after the deletion, and never
    /// loses its last entry here. An entry this leaves behind goes with the next pass.
    pub(crate) async fn release(&self, record: &SandboxRecord) {
        if self.retention.is_none() {
            return;
        }
        let name = sandbox_entry(&record.id);
        let taken_over = {
            let _recording = self.catalog.read().await;
            match self.metadata(&name) {
                Ok(Some(metadata)) => {
                    self.write_entry(&cache_entry(&record.image.manifest_digest), metadata)
                        .await
                }
                other => other.map(drop),
            }
        };
        if let Err(error) = taken_over {
            tracing::warn!(sandbox = %record.id, %error, "failed to keep a deleted Sandbox's image");
            return;
        }
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
        // A Sandbox's image is kept while its record exists, whether or not the Sandbox holds it
        // yet, as in a home from before Sandboxes held their images.
        let records = self.state.sandbox_records().await?;
        let sandboxes: HashSet<String> = records.iter().map(|record| entry_tag(&record.id)).collect();
        let used: HashSet<&str> = records
            .iter()
            .map(|record| record.image.manifest_digest.as_str())
            .collect();
        let cutoff = unix_millis(now).saturating_sub(i64::try_from(retention.as_millis()).unwrap_or(i64::MAX));
        for image in microsandbox::Image::list_local(self.client.local())
            .await
            .map_err(error::microsandbox)?
        {
            let last_used = image
                .last_used_at()
                .or_else(|| image.created_at())
                .map(|time| time.timestamp_millis());
            let unused = sandbox_entry_tag(image.reference()).map_or_else(
                || is_expired(last_used, cutoff) && image.manifest_digest().is_none_or(|digest| !used.contains(digest)),
                |tag| !sandboxes.contains(tag),
            );
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

    /// Reports whether a runtime records that it uses a held Sandbox image, which is what
    /// protects an image from Microsandbox's prune. Microsandbox refuses to remove an entry of an
    /// image a runtime records using, so a temporary entry that can be removed shows that none
    /// does. The Sandbox's own entry keeps the image meanwhile.
    pub(crate) async fn is_pinned(&self, record: &SandboxRecord) -> Result<bool, Error> {
        let Some(metadata) = self.metadata(&sandbox_entry(&record.id))? else {
            return Ok(false);
        };
        let probe = format!("{PROBE_REPOSITORY}:{}", entry_tag(&record.id));
        self.write_entry(&probe, metadata).await?;
        match microsandbox::Image::remove_local(self.client.local(), &probe, false).await {
            Ok(()) => Ok(false),
            Err(microsandbox::MicrosandboxError::ImageInUse(_)) => {
                microsandbox::Image::remove_local(self.client.local(), &probe, true)
                    .await
                    .map_err(error::microsandbox)?;
                Ok(true)
            }
            Err(failure) => Err(error::microsandbox(failure)),
        }
    }

    /// Completes the migration of a catalog from before Sandboxes held their images. Image
    /// versions no entry names, which a moved tag left behind, are reachable only through
    /// Microsandbox's prune, which also removes every entry of an image no runtime records
    /// using, so it runs only once every Sandbox's image [is pinned](Self::is_pinned), while the
    /// Provider opens and before anything else runs.
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

    /// Returns the metadata cached for a catalog entry.
    fn metadata(&self, name: &str) -> Result<Option<CachedImageMetadata>, Error> {
        let reference = name.parse::<Reference>().map_err(error::backend)?;
        self.global_cache()?
            .read_image_metadata(&reference)
            .map_err(error::backend)
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

/// Returns the catalog name of an image version's cache entry.
pub(crate) fn cache_entry(manifest_digest: &str) -> String {
    format!("{CACHE_REPOSITORY}@{manifest_digest}")
}

/// Returns the Sandbox ID tag of a Sandbox entry, or `None` for any other catalog entry.
fn sandbox_entry_tag(reference: &str) -> Option<&str> {
    let (repository, tag) = reference.rsplit_once(':')?;
    (repository == SANDBOX_REPOSITORY).then_some(tag)
}

/// Reports whether a cache entry was last used at or before the cutoff. An entry without a
/// recorded use has expired.
fn is_expired(last_used_millis: Option<i64>, cutoff_millis: i64) -> bool {
    last_used_millis.is_none_or(|used| used <= cutoff_millis)
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

    use super::{ImageCache, MIGRATED_MARKER, cache_entry, is_expired, sandbox_entry};
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

        /// Records an image the way resolving it does.
        async fn resolve(&self, images: &ImageCache, manifest_digest: &str) {
            images
                .record(async { Ok((metadata(manifest_digest), ())) })
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
    fn cache_entries_expire_once_last_used_before_the_cutoff() {
        assert!(!is_expired(Some(1001), 1000));
        assert!(is_expired(Some(1000), 1000));
        assert!(is_expired(None, 1000));
    }

    #[tokio::test(flavor = "local")]
    async fn a_deleted_sandboxs_image_stays_for_the_retention_period_after_the_deletion() {
        let home = Home::open().await;
        let images = home.images();
        let image = digest('a');
        home.resolve(&images, &image).await;
        let files = home.materialize(&image);
        let record = home.sandbox_needing(&image).await;
        let entry = images
            .hold(&record)
            .await
            .expect("hold")
            .expect("the image should be cached");
        assert_eq!(images.hold(&record).await.expect("hold again"), Some(entry.clone()));

        // Nothing is removed while the Sandbox uses the image, however long ago it was pulled.
        images
            .remove_unused_at(SystemTime::now() + 2 * DAY, DAY)
            .await
            .expect("pass");
        assert_eq!(home.references().await, [cache_entry(&image), entry]);

        home.state.remove_sandbox(&record).await.expect("record removed");
        images.release(&record).await;
        assert_eq!(home.references().await, [cache_entry(&image)]);
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
    async fn an_entry_whose_sandbox_record_is_gone_is_removed() {
        let home = Home::open().await;
        let images = home.images();
        let image = digest('a');
        home.resolve(&images, &image).await;
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
    async fn opening_a_provider_migrates_a_home_from_before_sandboxes_held_their_images() {
        let home = Home::open().await;
        let previous_files = record_moved_tag(&home).await;
        let legacy_archive = home.client.local().cache_dir().join("tmp/.tmpArchive");
        std::fs::create_dir_all(legacy_archive.parent().expect("legacy scratch")).expect("legacy scratch");
        std::fs::write(&legacy_archive, b"archive").expect("legacy archive");

        provider(home.path()).await;
        assert!(!previous_files.exists(), "what nothing holds is removed");
        assert!(!legacy_archive.exists());
        assert!(home.state.marker(MIGRATED_MARKER).exists());
    }

    /// Records a Sandbox built from a Dockerfile before this release, whose image only its
    /// import entry names, and which never started.
    async fn record_unstarted_built_sandbox(home: &Home) -> (SandboxRecord, PathBuf) {
        let image = digest('e');
        home.record_legacy("sandbox-microsandbox-import:docker-1234", &image)
            .await;
        let mut record = sandbox_record("00000000-0000-4000-8000-000000000009", &image);
        record.image.source = sandbox::image::ImageSource::Build {
            context: PathBuf::from("context"),
            dockerfile: PathBuf::from("Dockerfile"),
            target: None,
        };
        home.state.save_sandbox(&record).await.expect("record saved");
        (record, home.materialize(&image))
    }

    #[tokio::test(flavor = "local")]
    async fn migration_waits_for_a_sandbox_that_never_started_and_completes_once_it_is_deleted() {
        use sandbox::backend::SandboxBackend as _;

        let home = Home::open().await;
        let previous_files = record_moved_tag(&home).await;
        let (record, image_files) = record_unstarted_built_sandbox(&home).await;

        let provider = provider(home.path()).await;
        provider
            .images()
            .remove_unused_at(SystemTime::now() + 10 * DAY, DAY)
            .await
            .expect("pass");
        assert!(
            image_files.exists(),
            "the Sandbox keeps its image through the migration and later passes"
        );
        assert!(
            previous_files.exists(),
            "nothing is pruned while a Sandbox's image is unprotected"
        );
        assert!(!home.state.marker(MIGRATED_MARKER).exists());

        provider.delete(&record.id).await.expect("Sandbox deleted");
        drop(provider);
        crate::MicrosandboxProvider::builder(home.path())
            .remove_unused_images_after(DAY)
            .open()
            .await
            .expect("Provider should open");
        assert!(!previous_files.exists());
        assert!(home.state.marker(MIGRATED_MARKER).exists());
    }

    #[tokio::test(flavor = "local")]
    #[ignore = "seeds the Microsandbox database with python3"]
    async fn migration_keeps_the_image_of_a_sandbox_whose_first_start_was_interrupted() {
        let home = Home::open().await;
        let previous_files = record_moved_tag(&home).await;
        let (record, image_files) = record_unstarted_built_sandbox(&home).await;
        // A runtime whose creation stopped before Microsandbox recorded that it uses its image.
        let builder = Client::sandbox_builder(
            &record.runtime_name,
            "sandbox-microsandbox-import:docker-1234",
            record.resources,
        )
        .expect("runtime builder");
        let config = Box::pin(home.client.scope(builder.build()))
            .await
            .expect("runtime config");
        let seeded = std::process::Command::new("python3")
            .arg("-c")
            .arg(
                "import pathlib, sqlite3, sys; db = next(pathlib.Path(sys.argv[1]).rglob('msb.db')); \
                 connection = sqlite3.connect(db); connection.execute('INSERT INTO sandbox (name, config, status, ephemeral) \
                 VALUES (?, ?, ?, ?)', (sys.argv[2], sys.argv[3], 'Stopped', 0)); connection.commit()",
            )
            .arg(home.path())
            .arg(&record.runtime_name)
            .arg(serde_json::to_string(&config).expect("runtime config serializes"))
            .output()
            .expect("python3 should run");
        assert!(seeded.status.success(), "{}", String::from_utf8_lossy(&seeded.stderr));
        assert!(
            home.client
                .scope(microsandbox::Sandbox::get(&record.runtime_name))
                .await
                .is_ok(),
            "the runtime should exist"
        );

        let provider = provider(home.path()).await;
        provider
            .images()
            .remove_unused_at(SystemTime::now() + 10 * DAY, DAY)
            .await
            .expect("pass");
        assert!(image_files.exists());
        assert!(previous_files.exists());
        assert!(!home.state.marker(MIGRATED_MARKER).exists());
    }

    #[tokio::test(flavor = "local")]
    async fn an_image_recorded_before_cache_entries_is_held() {
        let home = Home::open().await;
        let image = digest('a');
        home.record_legacy("sandbox-microsandbox-import:docker-1234", &image)
            .await;
        let record = home.sandbox_needing(&image).await;

        assert_eq!(
            home.images().hold(&record).await.expect("hold"),
            Some(sandbox_entry(&record.id))
        );
        let unmanaged = ImageCache::new(home.client.clone(), home.state.clone(), None);
        let other = sandbox_record("00000000-0000-4000-8000-000000000004", &image);
        let name = unmanaged
            .hold(&other)
            .await
            .expect("hold")
            .expect("the image is cached");
        assert_ne!(name, sandbox_entry(&other.id));
        assert!(
            !home.references().await.contains(&sandbox_entry(&other.id)),
            "without a retention period nothing removes images, so no entry is added"
        );
    }

    #[tokio::test(flavor = "local")]
    async fn an_unreadable_sandbox_record_removes_nothing() {
        let home = Home::open().await;
        let images = home.images();
        let (held, unused) = (digest('a'), digest('b'));
        home.resolve(&images, &held).await;
        let record = home.sandbox_needing(&held).await;
        let entry = images
            .hold(&record)
            .await
            .expect("hold")
            .expect("the image should be cached");
        home.state.remove_sandbox(&record).await.expect("record removed");
        home.resolve(&images, &unused).await;
        std::fs::write(home.path().join("state/sandboxes/unreadable.json"), b"{").expect("unreadable record");

        assert!(images.remove_unused_at(SystemTime::now() + 2 * DAY, DAY).await.is_err());
        let references = home.references().await;
        assert!(references.contains(&entry) && references.contains(&cache_entry(&unused)));
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
        assert!(home.references().await.contains(&cache_entry(manifest_digest)));
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
    async fn create_unstarted(provider: &crate::MicrosandboxProvider, id: &str, reference: &str) -> sandbox::Sandbox {
        use sandbox::{backend::SandboxBackend as _, provider::SandboxProvider as _};

        let mode = sandbox::RootFilesystemMode::Direct;
        let image = provider
            .image_backend()
            .resolve(&sandbox::image::ResolveRequest {
                source: sandbox::image::ImageSource::Reference {
                    reference: reference.to_string(),
                },
                platform: native_platform(),
                root_filesystem_mode: mode,
            })
            .await
            .expect("image should resolve");
        provider
            .create(sandbox::backend::CreateSandboxRequest {
                id: id.parse().expect("Sandbox ID"),
                image,
                name: SandboxName::new("unstarted").expect("Sandbox name"),
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
        let unstarted = create_unstarted(
            &provider,
            "00000000-0000-4000-8000-0000000020d4",
            "docker.io/library/alpine:3.20",
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
    async fn migration_prunes_once_every_sandbox_image_is_pinned() {
        use sandbox::backend::SandboxBackend as _;

        let home = Home::open().await;
        let first = provider(home.path()).await;
        let service = sandbox::SandboxService::new(first.clone());
        let sandbox = service
            .ensure(&ensure_request(
                "running",
                "docker.io/library/alpine:3.21",
                sandbox::RootFilesystemMode::Layered,
            ))
            .await
            .expect("Sandbox should start")
            .snapshot()
            .clone();
        drop(service);
        drop(first);
        // Turn the home back into one from before this release, with a version a moved tag left.
        let previous_files = record_moved_tag(&home).await;
        std::fs::remove_file(home.state.marker(MIGRATED_MARKER)).expect("marker removed");

        let reopened = provider(home.path()).await;
        assert!(
            !previous_files.exists(),
            "every Sandbox's image is pinned, so the migration prunes"
        );
        assert!(home.state.marker(MIGRATED_MARKER).exists());
        reopened.stop(&sandbox.id).await.expect("Sandbox should stop");
        reopened
            .start(&sandbox.id)
            .await
            .expect("the Sandbox should keep its image and restart");
        reopened.delete(&sandbox.id).await.expect("Sandbox should be deleted");
    }
}
