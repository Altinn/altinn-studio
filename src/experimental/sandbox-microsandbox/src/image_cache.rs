//! Removal of cached images that no Sandbox needs.
//!
//! The Image Backend records every image version under a catalog reference that names only
//! that version, so removing the reference with Microsandbox's `Image::remove_local` removes
//! the version: its manifest, the layers no other version shares and its root filesystem
//! artifacts. An image is needed while a Sandbox record uses its manifest digest, whether or
//! not the Sandbox has a runtime. Any other image is removed once it has not been used for
//! the retention period. Using an image means resolving or importing it, which refreshes its
//! catalog reference.

use std::{
    collections::HashSet,
    path::PathBuf,
    rc::Rc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use sandbox::Error;
use tokio::sync::{RwLock, RwLockReadGuard};

use crate::{client::Client, error, state::StateStore};

/// Directory below the Microsandbox cache for this crate's image and build-context archives.
/// Microsandbox stages its own downloads in the parent directory.
pub(crate) const SCRATCH_DIRECTORY: &str = "tmp/sandbox-microsandbox";

/// The Microsandbox image cache of one Provider home.
#[derive(Clone)]
pub(crate) struct ImageCache {
    client: Client,
    state: StateStore,
    /// Removes unused images when set. Unset leaves the cache to its owner.
    retention: Option<Duration>,
    /// Shared by image uses and held exclusively by a removal pass.
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

    /// Holds off removal while an image is fetched and recorded, so a removal pass never
    /// removes an image it judged unused just before this use refreshed it.
    pub(crate) async fn record_use(&self) -> RwLockReadGuard<'_, ()> {
        self.catalog.read().await
    }

    /// Removes the images no Sandbox needs that have not been used for the retention period.
    ///
    /// Removal is best-effort and never fails the caller. A pass is skipped while an image
    /// is being recorded or another pass runs; the image operation ends with its own pass.
    pub(crate) async fn remove_unused(&self) {
        let Some(retention) = self.retention else {
            return;
        };
        let Ok(_exclusive) = self.catalog.try_write() else {
            return;
        };
        if let Err(error) = self.remove_unused_images(retention).await {
            tracing::warn!(%error, "failed to remove unused Microsandbox images");
        }
        self.remove_stale_scratch(retention).await;
    }

    async fn remove_unused_images(&self, retention: Duration) -> Result<(), Error> {
        let records = self.state.sandbox_records().await?;
        let needed: HashSet<&str> = records
            .iter()
            .map(|record| record.image.manifest_digest.as_str())
            .collect();
        let now = unix_millis(SystemTime::now());
        for image in microsandbox::Image::list_local(self.client.local())
            .await
            .map_err(error::microsandbox)?
        {
            let last_used = image
                .last_used_at()
                .or_else(|| image.created_at())
                .map(|time| time.timestamp_millis());
            if !is_removable(image.manifest_digest(), last_used, &needed, now, retention) {
                continue;
            }
            match microsandbox::Image::remove_local(self.client.local(), image.reference(), false).await {
                Ok(()) => tracing::info!(reference = image.reference(), "removed unused Microsandbox image"),
                // A runtime without a Sandbox record still uses it, or it is already gone.
                Err(
                    microsandbox::MicrosandboxError::ImageInUse(_) | microsandbox::MicrosandboxError::ImageNotFound(_),
                ) => {}
                Err(failure) => tracing::warn!(
                    reference = image.reference(),
                    error = %failure,
                    "failed to remove unused Microsandbox image"
                ),
            }
        }

        // Image versions that no catalog reference names, such as those a moved tag left
        // behind before images were recorded by digest, are reachable only through
        // Microsandbox's prune. Prune also removes every reference no runtime has recorded
        // that it uses, so it runs only when each remaining reference belongs to a Sandbox
        // whose runtime this Provider has created and which still exists.
        let mut pinned = HashSet::new();
        for record in &records {
            if record.runtime_created && self.client.runtime_handle(&record.runtime_name).await?.is_some() {
                pinned.insert(record.image.manifest_digest.as_str());
            }
        }
        let remaining = microsandbox::Image::list_local(self.client.local())
            .await
            .map_err(error::microsandbox)?;
        if remaining
            .iter()
            .all(|image| image.manifest_digest().is_some_and(|digest| pinned.contains(digest)))
        {
            let report = microsandbox::Image::prune_local(self.client.local())
                .await
                .map_err(error::microsandbox)?;
            if report.manifests_removed > 0 {
                tracing::info!(
                    manifests = report.manifests_removed,
                    layers = report.layers_removed,
                    "removed Microsandbox image versions no catalog reference named"
                );
            }
        }
        Ok(())
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

/// Reports whether an image may be removed: no Sandbox needs its manifest and it has not
/// been used for the retention period. An image without a recorded use is removable.
fn is_removable(
    manifest_digest: Option<&str>,
    last_used_millis: Option<i64>,
    needed: &HashSet<&str>,
    now_millis: i64,
    retention: Duration,
) -> bool {
    if manifest_digest.is_some_and(|digest| needed.contains(digest)) {
        return false;
    }
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
    use std::{collections::BTreeMap, collections::HashSet, path::PathBuf, time::Duration};

    use sandbox::{ByteQuantity, CpuQuantity, Hostname, Platform, RootFilesystem, SandboxName, SandboxResources};

    use super::{ImageCache, is_removable};
    use crate::{
        client::Client,
        state::{SandboxRecord, StateStore},
    };

    struct Home {
        _directory: tempfile::TempDir,
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
                _directory: directory,
                client,
                state,
            }
        }

        fn images(&self, retention: Duration) -> ImageCache {
            ImageCache::new(self.client.clone(), self.state.clone(), Some(retention))
        }

        fn cache(&self) -> microsandbox_image::GlobalCache {
            microsandbox_image::GlobalCache::new(&self.client.local().cache_dir()).expect("image cache should open")
        }

        async fn record(&self, reference: &str, manifest_digest: &str) {
            let metadata = microsandbox_image::CachedImageMetadata {
                manifest_digest: manifest_digest.to_string(),
                config_digest: digest('c'),
                raw_manifest_json: "{}".to_string(),
                raw_config_json: "{}".to_string(),
                config: microsandbox_image::ImageConfig::default(),
                layers: Vec::new(),
            };
            microsandbox::Image::persist(self.client.local(), reference, metadata)
                .await
                .expect("image should be recorded");
        }

        /// Stands in for the files Microsandbox materializes for an image version.
        fn materialize(&self, manifest_digest: &str) -> PathBuf {
            let path = self
                .cache()
                .fsmeta_erofs_path(&manifest_digest.parse().expect("digest should parse"));
            std::fs::create_dir_all(path.parent().expect("fsmeta directory")).expect("fsmeta directory");
            std::fs::write(&path, b"fsmeta").expect("fsmeta file");
            path
        }

        async fn sandbox_needing(&self, manifest_digest: &str) {
            let record = SandboxRecord::new(sandbox::backend::CreateSandboxRequest {
                id: "00000000-0000-4000-8000-000000000001".parse().expect("Sandbox ID"),
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
            });
            self.state
                .save_sandbox(&record)
                .await
                .expect("Sandbox record should be saved");
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

    fn digest(fill: char) -> String {
        format!("sha256:{}", fill.to_string().repeat(64))
    }

    #[tokio::test(flavor = "local")]
    async fn images_no_sandbox_needs_are_removed_once_unused_for_the_retention_period() {
        let home = Home::open().await;
        let (needed, unused) = (digest('a'), digest('b'));
        home.record(&format!("example.com/app@{needed}"), &needed).await;
        home.record(&format!("example.com/app@{unused}"), &unused).await;
        home.sandbox_needing(&needed).await;

        home.images(Duration::from_hours(1)).remove_unused().await;
        assert_eq!(home.references().await.len(), 2, "recently used images are kept");

        home.images(Duration::ZERO).remove_unused().await;
        assert_eq!(home.references().await, [format!("example.com/app@{needed}")]);
    }

    #[tokio::test(flavor = "local")]
    async fn versions_no_reference_names_are_removed_when_prune_cannot_remove_a_needed_reference() {
        let home = Home::open().await;
        let (previous, current) = (digest('a'), digest('b'));
        // A tag recorded before images were recorded by digest leaves its previous
        // version without a reference when it moves.
        home.record("example.com/app:latest", &previous).await;
        home.record("example.com/app:latest", &current).await;
        let previous_files = home.materialize(&previous);

        home.sandbox_needing(&current).await;
        home.images(Duration::ZERO).remove_unused().await;
        assert!(
            previous_files.exists(),
            "prune would remove the reference of a Sandbox without a runtime"
        );
        assert_eq!(home.references().await, ["example.com/app:latest"]);

        home.state
            .remove_sandbox(&home.state.sandbox_records().await.expect("records")[0])
            .await
            .expect("Sandbox record should be removed");
        home.images(Duration::ZERO).remove_unused().await;
        assert!(home.references().await.is_empty());
        assert!(!previous_files.exists(), "the unreferenced version should be pruned");
    }

    #[tokio::test(flavor = "local")]
    async fn without_a_retention_period_the_cache_is_left_alone() {
        let home = Home::open().await;
        let unused = digest('b');
        home.record(&format!("example.com/app@{unused}"), &unused).await;

        ImageCache::new(home.client.clone(), home.state.clone(), None)
            .remove_unused()
            .await;
        assert_eq!(home.references().await.len(), 1);
    }

    const HOUR: i64 = 60 * 60 * 1000;
    const RETENTION: Duration = Duration::from_hours(24);

    #[test]
    fn needed_images_are_kept_however_long_ago_they_were_used() {
        let needed = HashSet::from(["sha256:needed"]);
        assert!(!is_removable(
            Some("sha256:needed"),
            Some(0),
            &needed,
            1000 * HOUR,
            RETENTION
        ));
    }

    #[test]
    fn unneeded_images_are_kept_until_the_retention_period_passes() {
        let needed = HashSet::new();
        let now = 1000 * HOUR;
        assert!(!is_removable(
            Some("sha256:unused"),
            Some(now - 23 * HOUR),
            &needed,
            now,
            RETENTION
        ));
        assert!(is_removable(
            Some("sha256:unused"),
            Some(now - 24 * HOUR),
            &needed,
            now,
            RETENTION
        ));
    }

    #[test]
    fn images_without_a_recorded_use_or_manifest_are_removable_when_unneeded() {
        let needed = HashSet::from(["sha256:needed"]);
        assert!(is_removable(
            Some("sha256:unused"),
            None,
            &needed,
            1000 * HOUR,
            RETENTION
        ));
        assert!(is_removable(None, Some(0), &needed, 1000 * HOUR, RETENTION));
    }

    #[test]
    fn a_use_recorded_after_now_keeps_the_image() {
        let needed = HashSet::new();
        assert!(!is_removable(
            Some("sha256:unused"),
            Some(1000 * HOUR + 1),
            &needed,
            1000 * HOUR,
            RETENTION
        ));
    }
}
