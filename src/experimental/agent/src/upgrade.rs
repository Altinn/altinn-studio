//! Durable installation and state shared by an updater and the first daemon startup.

use std::{
    collections::BTreeSet,
    env,
    fmt::Write as _,
    fs::{self, File, OpenOptions},
    io::{Read as _, Write as _},
    path::{Component, Path, PathBuf},
    process::Command,
    sync::OnceLock,
    time::Duration,
};

use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use sha2::{Digest as _, Sha256};

use crate::{Error, local::home::ControlPlaneHome, sessions};

const INSTALL_FORMAT: u32 = 1;
const JOURNAL_FORMAT: u32 = 1;
const HTTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const HTTP_REQUEST_TIMEOUT: Duration = Duration::from_mins(1);

/// Filesystem locations for one managed Agent installation.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InstallPaths {
    root: PathBuf,
    bin: PathBuf,
}

impl InstallPaths {
    /// Resolves environment overrides and platform defaults.
    ///
    /// # Errors
    ///
    /// Returns an error when the platform's user directory cannot be resolved.
    pub fn resolve() -> Result<Self, Error> {
        let root = match env::var_os("AGENT_INSTALL_ROOT").filter(|value| !value.is_empty()) {
            Some(path) => absolute(Path::new(&path))?,
            None => default_install_root()?,
        };
        let bin = match env::var_os("AGENT_INSTALL_DIR").filter(|value| !value.is_empty()) {
            Some(path) => absolute(Path::new(&path))?,
            #[cfg(unix)]
            None => default_bin_directory()?,
            #[cfg(windows)]
            None => root.join("bin"),
        };
        Ok(Self { root, bin })
    }

    /// Constructs explicit locations for installer handoff and tests.
    ///
    /// # Errors
    ///
    /// Returns an error unless both paths are absolute.
    pub fn new(root: PathBuf, bin: PathBuf) -> Result<Self, Error> {
        if !root.is_absolute() || !bin.is_absolute() {
            return Err(Error::Invalid("installation paths must be absolute".into()));
        }
        Ok(Self { root, bin })
    }

    #[must_use]
    pub fn root(&self) -> &Path {
        &self.root
    }

    #[must_use]
    pub fn bin(&self) -> &Path {
        &self.bin
    }

    #[must_use]
    pub fn releases(&self) -> PathBuf {
        self.root.join("releases")
    }

    #[must_use]
    pub fn current(&self) -> PathBuf {
        self.root.join("current")
    }

    #[must_use]
    pub fn journal(&self) -> PathBuf {
        self.root.join("update.json")
    }

    #[must_use]
    pub fn metadata(&self) -> PathBuf {
        self.root.join("install.json")
    }

    /// Serializes installers and updaters.
    ///
    /// # Errors
    ///
    /// Returns an error when the lock cannot be created or acquired.
    pub fn lock(&self) -> Result<InstallLock, Error> {
        fs::create_dir_all(&self.root)?;
        crate::local::home::secure_directory(&self.root)?;
        let path = self.root.join("install.lock");
        let file = OpenOptions::new()
            .create(true)
            .read(true)
            .write(true)
            .truncate(false)
            .open(&path)?;
        crate::local::home::secure_file(&path)?;
        match file.try_lock() {
            Ok(()) => {}
            Err(std::fs::TryLockError::WouldBlock) => {
                return Err(Error::Daemon("another Agent update is already running".into()));
            }
            Err(std::fs::TryLockError::Error(error)) => return Err(Error::Io(error)),
        }
        Ok(InstallLock { _file: file })
    }
}

#[derive(Debug)]
pub struct InstallLock {
    _file: File,
}

/// Non-secret facts about a managed installation.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct InstallMetadata {
    format_version: u32,
    repository: String,
    channel: String,
    target: String,
    bin_directory: PathBuf,
}

impl InstallMetadata {
    #[must_use]
    pub fn new(repository: String, bin_directory: PathBuf) -> Self {
        Self {
            format_version: INSTALL_FORMAT,
            repository,
            channel: "experimental-agent".into(),
            target: package_target().into(),
            bin_directory,
        }
    }

    #[must_use]
    pub fn repository(&self) -> &str {
        &self.repository
    }

    /// Writes the metadata atomically.
    ///
    /// # Errors
    ///
    /// Returns an error when serialization or durable replacement fails.
    pub fn write(&self, paths: &InstallPaths) -> Result<(), Error> {
        atomic_json(&paths.metadata(), self)
    }

    /// Reads and validates the managed installation metadata.
    ///
    /// # Errors
    ///
    /// Returns an error for invalid, incompatible, or unreadable metadata.
    pub fn read(paths: &InstallPaths) -> Result<Self, Error> {
        let metadata: Self = serde_json::from_slice(&fs::read(paths.metadata())?)?;
        if metadata.format_version != INSTALL_FORMAT || metadata.target != package_target() {
            return Err(Error::Invalid(
                "managed Agent installation has an incompatible format or target".into(),
            ));
        }
        Ok(metadata)
    }
}

/// One resolved release package.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Release {
    pub version: String,
    pub repository: String,
    pub local_archive: Option<PathBuf>,
    pub local_checksum: Option<PathBuf>,
}

impl Release {
    /// Resolves an explicit release, a local package, or the latest GitHub release.
    ///
    /// # Errors
    ///
    /// Returns an error when release resolution or version validation fails.
    pub async fn resolve(version: Option<&str>, repository: String) -> Result<Self, Error> {
        let local_archive = env::var_os("AGENT_LOCAL_ARCHIVE")
            .filter(|value| !value.is_empty())
            .map(PathBuf::from);
        let version = match version {
            Some(version) => normalize_version(version)?,
            None if local_archive.is_some() => normalize_version(
                &env::var("AGENT_VERSION")
                    .map_err(|_| Error::Invalid("AGENT_VERSION is required with AGENT_LOCAL_ARCHIVE".into()))?,
            )?,
            None => latest_release(&repository).await?,
        };
        let local_checksum = local_archive.as_ref().map(|archive| {
            env::var_os("AGENT_LOCAL_ARCHIVE_SHA256")
                .map_or_else(|| PathBuf::from(format!("{}.sha256", archive.display())), PathBuf::from)
        });
        Ok(Self {
            version,
            repository,
            local_archive,
            local_checksum,
        })
    }

    #[must_use]
    pub fn directory_name(&self) -> String {
        format!("{}-{}", self.version, package_target())
    }

    fn archive_name() -> String {
        format!("agent-{}.tar.gz", package_target())
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StagedRelease {
    pub release: Release,
    pub path: PathBuf,
}

/// Downloads, verifies, extracts, and validates a release without changing `current`.
///
/// # Errors
///
/// Returns an error when download, checksum, archive, or binary validation fails.
pub async fn stage_release(paths: &InstallPaths, release: Release) -> Result<StagedRelease, Error> {
    fs::create_dir_all(paths.releases())?;
    let final_path = paths.releases().join(release.directory_name());
    if final_path.exists() {
        validate_release_directory(&final_path, &release.version)?;
        return Ok(StagedRelease {
            release,
            path: final_path,
        });
    }
    let temporary = tempfile::Builder::new()
        .prefix(".staging-")
        .tempdir_in(paths.releases())?;
    let archive = temporary.path().join(Release::archive_name());
    let checksum = temporary.path().join(format!("{}.sha256", Release::archive_name()));
    if let Some(local) = &release.local_archive {
        fs::copy(local, &archive)?;
        fs::copy(
            release
                .local_checksum
                .as_ref()
                .ok_or_else(|| Error::Invalid("local package checksum is missing".into()))?,
            &checksum,
        )?;
    } else {
        let base = format!(
            "https://github.com/{}/releases/download/experimental-agent/{}",
            release.repository, release.version
        );
        download(&format!("{base}/{}", Release::archive_name()), &archive).await?;
        download(&format!("{base}/{}.sha256", Release::archive_name()), &checksum).await?;
    }
    verify_checksum(&archive, &checksum)?;
    let extracted = temporary.path().join("release");
    fs::create_dir(&extracted)?;
    extract_archive(&archive, &extracted)?;
    validate_release_directory(&extracted, &release.version)?;
    fs::rename(&extracted, &final_path)?;
    #[cfg(unix)]
    sync_directory(&paths.releases())?;
    Ok(StagedRelease {
        release,
        path: final_path,
    })
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdatePhase {
    Prepared,
    DaemonStopped,
    Migrated,
    Activated,
    Verified,
    Complete,
}

/// Target-owned durable update journal.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct UpdateJournal {
    format_version: u32,
    pub previous_release: Option<PathBuf>,
    pub target_release: PathBuf,
    pub target_version: String,
    pub phase: UpdatePhase,
}

impl UpdateJournal {
    #[must_use]
    pub const fn new(previous_release: Option<PathBuf>, target_release: PathBuf, target_version: String) -> Self {
        Self {
            format_version: JOURNAL_FORMAT,
            previous_release,
            target_release,
            target_version,
            phase: UpdatePhase::Prepared,
        }
    }

    /// Reads the journal when one exists.
    ///
    /// # Errors
    ///
    /// Returns an error for invalid, unsupported, or unsafe journal data.
    pub fn read(paths: &InstallPaths) -> Result<Option<Self>, Error> {
        let bytes = match fs::read(paths.journal()) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(error) => return Err(error.into()),
        };
        let journal: Self = serde_json::from_slice(&bytes)?;
        if journal.format_version != JOURNAL_FORMAT {
            return Err(Error::Invalid("unsupported Agent update journal format".into()));
        }
        journal.validate(paths)?;
        Ok(Some(journal))
    }

    /// Durably advances the state machine.
    ///
    /// # Errors
    ///
    /// Returns an error for backward movement or a failed write.
    pub fn advance(&mut self, paths: &InstallPaths, phase: UpdatePhase) -> Result<(), Error> {
        if phase < self.phase {
            return Err(Error::Invalid("Agent update journal cannot move backwards".into()));
        }
        self.phase = phase;
        atomic_json(&paths.journal(), self)
    }

    fn validate(&self, paths: &InstallPaths) -> Result<(), Error> {
        let releases = canonical_or_absolute(&paths.releases())?;
        for path in self
            .previous_release
            .iter()
            .chain(std::iter::once(&self.target_release))
        {
            if !path.is_absolute() {
                return Err(Error::Invalid(
                    "Agent update journal names a release outside the install root".into(),
                ));
            }
            let resolved = fs::canonicalize(path)
                .map_err(|_| Error::Invalid("Agent update journal names a release that no longer exists".into()))?;
            if resolved.parent() != Some(releases.as_path()) {
                return Err(Error::Invalid(
                    "Agent update journal names a release outside the install root".into(),
                ));
            }
        }
        Ok(())
    }
}

/// Reads the active release pointer.
///
/// # Errors
///
/// Returns an error when the pointer cannot be read.
pub fn current_release(paths: &InstallPaths) -> Result<Option<PathBuf>, Error> {
    read_current(paths)
}

#[cfg(unix)]
fn read_current(paths: &InstallPaths) -> Result<Option<PathBuf>, Error> {
    match fs::read_link(paths.current()) {
        Ok(target) => Ok(Some(if target.is_absolute() {
            target
        } else {
            paths.root.join(target)
        })),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

#[cfg(windows)]
fn read_current(paths: &InstallPaths) -> Result<Option<PathBuf>, Error> {
    match fs::read_to_string(paths.current()) {
        Ok(target) => Ok(Some(PathBuf::from(target.trim()))),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

/// Atomically selects a release and refreshes the user-visible launch paths.
///
/// # Errors
///
/// Returns an error for an unsafe target or a failed filesystem operation.
pub fn activate_release(paths: &InstallPaths, target: &Path) -> Result<(), Error> {
    let releases = canonical_or_absolute(&paths.releases())?;
    let target = fs::canonicalize(target)?;
    if !target.is_absolute() || target.parent() != Some(releases.as_path()) {
        return Err(Error::Invalid(
            "target release is outside the managed releases directory".into(),
        ));
    }
    activate_links(paths, &target)?;
    #[cfg(unix)]
    sync_directory(paths.root())?;
    Ok(())
}

#[cfg(unix)]
fn activate_links(paths: &InstallPaths, target: &Path) -> Result<(), Error> {
    replace_directory_link(&paths.current(), target)?;
    fs::create_dir_all(paths.bin())?;
    for binary in binary_names() {
        replace_file_link(&paths.bin.join(binary), &paths.current().join(binary))?;
    }
    Ok(())
}

#[cfg(windows)]
fn activate_links(paths: &InstallPaths, target: &Path) -> Result<(), Error> {
    replace_windows_pointer(&paths.current(), target)?;
    fs::create_dir_all(paths.bin())?;
    for binary in ["agentctl", "agentd"] {
        let legacy = paths.bin().join(format!("{binary}.exe"));
        if legacy.exists() {
            fs::remove_file(legacy)?;
        }
        let root = paths.root().to_string_lossy().replace('%', "%%");
        let script = format!(
            "@echo off\r\nsetlocal\r\nset /p AGENT_CURRENT=<\"{root}\\current\"\r\n\"%AGENT_CURRENT%\\{binary}.exe\" %*\r\n"
        );
        replace_windows_file(&paths.bin().join(format!("{binary}.cmd")), script.as_bytes())?;
    }
    Ok(())
}

/// Durably requests one target-daemon Session relaunch pass.
///
/// # Errors
///
/// Returns an error when the marker cannot be written securely.
pub fn create_session_relaunch_marker(home: &ControlPlaneHome, build_version: &str) -> Result<(), Error> {
    home.prepare()?;
    atomic_json(
        &home.pending_session_relaunch_path(),
        &SessionRelaunchMarker {
            build_version: build_version.into(),
        },
    )
}

/// Keeps current and previous releases plus anything needed by an unfinished update.
///
/// # Errors
///
/// Returns an error when releases cannot be enumerated or removed.
pub fn prune_releases(paths: &InstallPaths, previous: Option<&Path>) -> Result<(), Error> {
    let mut keep = BTreeSet::new();
    keep.extend(current_release(paths)?);
    keep.extend(previous.map(Path::to_path_buf));
    if let Some(journal) = UpdateJournal::read(paths)?.filter(|journal| journal.phase != UpdatePhase::Complete) {
        keep.insert(journal.target_release);
        keep.extend(journal.previous_release);
    }
    let keep = keep
        .into_iter()
        .map(fs::canonicalize)
        .collect::<Result<BTreeSet<_>, _>>()?;
    for entry in fs::read_dir(paths.releases())? {
        let entry = entry?;
        let path = entry.path();
        if entry.file_type()?.is_dir() && !keep.contains(&fs::canonicalize(&path)?) {
            fs::remove_dir_all(path)?;
        }
    }
    Ok(())
}

#[must_use]
pub const fn package_target() -> &'static str {
    if cfg!(all(target_os = "linux", target_arch = "x86_64")) {
        "linux-x86_64"
    } else if cfg!(all(target_os = "linux", target_arch = "aarch64")) {
        "linux-aarch64"
    } else if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        "macos-aarch64"
    } else if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        "windows-x86_64"
    } else if cfg!(all(target_os = "windows", target_arch = "aarch64")) {
        "windows-aarch64"
    } else {
        "unsupported"
    }
}

/// Runs and acknowledges a pending post-upgrade Session relaunch pass.
///
/// # Errors
///
/// Returns an error while retaining the marker when the pass cannot complete safely.
pub async fn consume_pending_session_relaunch(
    home: &ControlPlaneHome,
    service: &sessions::Service,
) -> Result<(), Error> {
    let path = home.pending_session_relaunch_path();
    let bytes = match tokio::fs::read(&path).await {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.into()),
    };
    crate::local::home::secure_file(&path)?;
    let marker: SessionRelaunchMarker = serde_json::from_slice(&bytes)?;
    if marker.build_version != crate::build_version() {
        return Err(Error::Daemon(format!(
            "Session relaunch marker targets build {:?}, but this agentd is {:?}",
            marker.build_version,
            crate::build_version()
        )));
    }
    service.relaunch_after_upgrade().await?;
    tokio::fs::remove_file(path).await?;
    #[cfg(unix)]
    sync_directory(home.path())?;
    Ok(())
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct SessionRelaunchMarker {
    build_version: String,
}

async fn latest_release(repository: &str) -> Result<String, Error> {
    #[derive(Deserialize)]
    struct GithubRelease {
        tag_name: String,
    }
    let client = http_client()?;
    for page in 1_u32.. {
        let releases = client
            .get(format!(
                "https://api.github.com/repos/{repository}/releases?per_page=100&page={page}"
            ))
            .header(reqwest::header::USER_AGENT, "Altinn-Agent-updater")
            .send()
            .await
            .map_err(|error| Error::Daemon(format!("resolve Agent release: {error}")))?
            .error_for_status()
            .map_err(|error| Error::Daemon(format!("resolve Agent release: {error}")))?
            .json::<Vec<GithubRelease>>()
            .await
            .map_err(|error| Error::Daemon(format!("decode Agent releases: {error}")))?;
        if let Some(version) = releases
            .iter()
            .find_map(|release| release.tag_name.strip_prefix("experimental-agent/"))
        {
            return normalize_version(version);
        }
        if releases.len() < 100 {
            break;
        }
    }
    Err(Error::Invalid("GitHub has no experimental Agent release".into()))
}

async fn download(url: &str, path: &Path) -> Result<(), Error> {
    let bytes = http_client()?
        .get(url)
        .header(reqwest::header::USER_AGENT, "Altinn-Agent-updater")
        .send()
        .await
        .map_err(|error| Error::Daemon(format!("download Agent package: {error}")))?
        .error_for_status()
        .map_err(|error| Error::Daemon(format!("download Agent package: {error}")))?
        .bytes()
        .await
        .map_err(|error| Error::Daemon(format!("read Agent package: {error}")))?;
    fs::write(path, bytes)?;
    Ok(())
}

fn http_client() -> Result<&'static reqwest::Client, Error> {
    static CLIENT: OnceLock<Result<reqwest::Client, String>> = OnceLock::new();
    CLIENT
        .get_or_init(|| {
            reqwest::Client::builder()
                .connect_timeout(HTTP_CONNECT_TIMEOUT)
                .timeout(HTTP_REQUEST_TIMEOUT)
                .build()
                .map_err(|error| error.to_string())
        })
        .as_ref()
        .map_err(|error| Error::Daemon(format!("create Agent update HTTP client: {error}")))
}

fn normalize_version(version: &str) -> Result<String, Error> {
    let trimmed = version.trim();
    let bare = trimmed.strip_prefix('v').unwrap_or(trimmed);
    semver::Version::parse(bare).map_err(|error| Error::Invalid(format!("invalid Agent release version: {error}")))?;
    Ok(format!("v{bare}"))
}

fn verify_checksum(archive: &Path, checksum: &Path) -> Result<(), Error> {
    let expected = fs::read_to_string(checksum)?
        .split_whitespace()
        .next()
        .ok_or_else(|| Error::Invalid("Agent checksum file is empty".into()))?
        .to_ascii_lowercase();
    if expected.len() != 64 || !expected.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(Error::Invalid("Agent checksum is not SHA-256".into()));
    }
    let mut input = File::open(archive)?;
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 8 * 1024];
    loop {
        let read = input.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    let actual = digest
        .finalize()
        .iter()
        .fold(String::with_capacity(64), |mut output, byte| {
            let _ = write!(output, "{byte:02x}");
            output
        });
    if actual != expected {
        return Err(Error::Invalid("Agent archive checksum mismatch".into()));
    }
    Ok(())
}

fn extract_archive(archive: &Path, destination: &Path) -> Result<(), Error> {
    let mut package = tar::Archive::new(GzDecoder::new(File::open(archive)?));
    let expected = binary_names().into_iter().map(str::to_owned).collect::<BTreeSet<_>>();
    let mut found = BTreeSet::new();
    for entry in package
        .entries()
        .map_err(|error| Error::Invalid(format!("invalid Agent archive: {error}")))?
    {
        let mut entry = entry.map_err(|error| Error::Invalid(format!("invalid Agent archive: {error}")))?;
        let path = entry
            .path()
            .map_err(|error| Error::Invalid(format!("invalid Agent archive: {error}")))?;
        let mut components = path.components();
        let Some(Component::Normal(name)) = components.next() else {
            return Err(Error::Invalid("Agent archive contains an invalid path".into()));
        };
        if components.next().is_some() {
            return Err(Error::Invalid(
                "Agent archive must contain only top-level binaries".into(),
            ));
        }
        let name = name
            .to_str()
            .ok_or_else(|| Error::Invalid("Agent archive contains a non-UTF-8 path".into()))?;
        if !expected.contains(name) || !found.insert(name.to_owned()) || !entry.header().entry_type().is_file() {
            return Err(Error::Invalid(format!("unexpected Agent archive entry {name:?}")));
        }
        entry
            .unpack(destination.join(name))
            .map_err(|error| Error::Invalid(format!("invalid Agent archive: {error}")))?;
    }
    if found != expected {
        return Err(Error::Invalid(
            "Agent archive does not contain one matched agentctl and agentd".into(),
        ));
    }
    Ok(())
}

/// Validates the exact package contents and both embedded build versions.
///
/// # Errors
///
/// Returns an error when the directory is not one matched release.
pub fn validate_release_directory(path: &Path, version: &str) -> Result<(), Error> {
    let entries = fs::read_dir(path)?
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(|entry| entry.file_name())
        .collect::<BTreeSet<_>>();
    let expected = binary_names().into_iter().map(Into::into).collect::<BTreeSet<_>>();
    if entries != expected {
        return Err(Error::Invalid(
            "Agent release directory must contain only agentctl and agentd".into(),
        ));
    }
    for binary in binary_names() {
        let executable = path.join(binary);
        require_executable(&executable)?;
        let output = Command::new(&executable).arg("--version").output()?;
        let actual = String::from_utf8_lossy(&output.stdout);
        let name = binary.trim_end_matches(std::env::consts::EXE_SUFFIX);
        if !output.status.success() || actual.trim() != format!("{name} {version}") {
            return Err(Error::Invalid(format!(
                "{} reports {:?}; expected {name} {version:?}",
                executable.display(),
                actual.trim()
            )));
        }
    }
    Ok(())
}

#[cfg(unix)]
fn require_executable(path: &Path) -> Result<(), Error> {
    use std::os::unix::fs::PermissionsExt as _;
    if fs::metadata(path)?.permissions().mode() & 0o111 == 0 {
        return Err(Error::Invalid(format!("{} is not executable", path.display())));
    }
    Ok(())
}

#[cfg(windows)]
fn require_executable(path: &Path) -> Result<(), Error> {
    if !path.is_file() {
        return Err(Error::Invalid(format!("{} is not a file", path.display())));
    }
    Ok(())
}

const fn binary_names() -> [&'static str; 2] {
    if cfg!(windows) {
        ["agentctl.exe", "agentd.exe"]
    } else {
        ["agentctl", "agentd"]
    }
}

fn atomic_json(path: &Path, value: &impl Serialize) -> Result<(), Error> {
    let parent = path
        .parent()
        .ok_or_else(|| Error::Invalid("state path has no parent directory".into()))?;
    fs::create_dir_all(parent)?;
    crate::local::home::secure_directory(parent)?;
    let temporary = path.with_extension(format!("tmp-{}", std::process::id()));
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&temporary)?;
    crate::local::home::secure_file(&temporary)?;
    file.write_all(&serde_json::to_vec_pretty(value)?)?;
    file.write_all(b"\n")?;
    file.sync_all()?;
    drop(file);
    fs::rename(&temporary, path)?;
    #[cfg(unix)]
    sync_directory(parent)?;
    Ok(())
}

fn canonical_or_absolute(path: &Path) -> Result<PathBuf, Error> {
    if path.exists() {
        Ok(fs::canonicalize(path)?)
    } else if path.is_absolute() {
        Ok(path.to_path_buf())
    } else {
        Err(Error::Invalid("managed installation path must be absolute".into()))
    }
}

fn absolute(path: &Path) -> Result<PathBuf, Error> {
    if path.is_absolute() {
        Ok(path.to_path_buf())
    } else {
        Ok(env::current_dir()?.join(path))
    }
}

#[cfg(unix)]
fn default_install_root() -> Result<PathBuf, Error> {
    if let Some(path) = env::var_os("XDG_DATA_HOME").filter(|value| !value.is_empty()) {
        return Ok(PathBuf::from(path).join("agent"));
    }
    env::var_os("HOME")
        .map(PathBuf::from)
        .map(|path| path.join(".local/share/agent"))
        .ok_or_else(|| Error::Invalid("HOME is not set".into()))
}

#[cfg(unix)]
fn default_bin_directory() -> Result<PathBuf, Error> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .map(|path| path.join(".local/bin"))
        .ok_or_else(|| Error::Invalid("HOME is not set".into()))
}

#[cfg(windows)]
fn default_install_root() -> Result<PathBuf, Error> {
    env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|path| path.join("Agent"))
        .ok_or_else(|| Error::Invalid("LOCALAPPDATA is not set".into()))
}

#[cfg(unix)]
fn replace_directory_link(link: &Path, target: &Path) -> Result<(), Error> {
    use std::os::unix::fs::symlink;
    replace_symlink(link, |temporary| symlink(target, temporary))
}

#[cfg(unix)]
fn replace_file_link(link: &Path, target: &Path) -> Result<(), Error> {
    use std::os::unix::fs::symlink;
    replace_symlink(link, |temporary| symlink(target, temporary))
}

#[cfg(unix)]
fn replace_symlink(link: &Path, create: impl FnOnce(&Path) -> std::io::Result<()>) -> Result<(), Error> {
    let temporary = link.with_extension(format!("next-{}", std::process::id()));
    let _ = fs::remove_file(&temporary);
    create(&temporary)?;
    fs::rename(temporary, link)?;
    Ok(())
}

#[cfg(windows)]
fn replace_windows_pointer(path: &Path, target: &Path) -> Result<(), Error> {
    replace_windows_file(path, format!("{}\r\n", target.display()).as_bytes())
}

#[cfg(windows)]
fn replace_windows_file(path: &Path, contents: &[u8]) -> Result<(), Error> {
    let temporary = path.with_extension(format!("next-{}", std::process::id()));
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&temporary)?;
    file.write_all(contents)?;
    file.sync_all()?;
    drop(file);
    fs::rename(temporary, path)?;
    Ok(())
}

#[cfg(unix)]
fn sync_directory(path: &Path) -> Result<(), Error> {
    File::open(path)?.sync_all()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn journal_rejects_release_outside_install_root() {
        let temporary = tempfile::TempDir::new().expect("temporary directory");
        let root = temporary.path().join("root");
        let paths = InstallPaths::new(root, temporary.path().join("bin")).expect("paths");
        fs::create_dir_all(paths.releases()).expect("releases");
        let journal = UpdateJournal::new(None, temporary.path().join("elsewhere"), "v2.0.0".into());
        assert!(journal.validate(&paths).is_err());
    }

    #[test]
    fn install_lock_reports_a_concurrent_update() {
        let temporary = tempfile::TempDir::new().expect("temporary directory");
        let paths = InstallPaths::new(temporary.path().join("install"), temporary.path().join("bin")).expect("paths");
        let _first = paths.lock().expect("first lock");

        let error = paths.lock().expect_err("second lock");

        assert!(error.to_string().contains("another Agent update is already running"));
    }

    #[test]
    fn relaunch_marker_is_owner_only() {
        let temporary = tempfile::TempDir::new().expect("temporary directory");
        let home = ControlPlaneHome::resolve(Some(temporary.path())).expect("home");
        create_session_relaunch_marker(&home, "v2").expect("marker");
        let marker: SessionRelaunchMarker =
            serde_json::from_slice(&fs::read(home.pending_session_relaunch_path()).expect("read marker"))
                .expect("decode marker");
        assert_eq!(marker.build_version, "v2");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            assert_eq!(
                fs::metadata(home.pending_session_relaunch_path())
                    .expect("metadata")
                    .permissions()
                    .mode()
                    & 0o777,
                0o600
            );
        }
    }

    #[tokio::test(flavor = "local")]
    async fn checksum_failure_does_not_create_a_release_or_current_pointer() {
        let temporary = tempfile::TempDir::new().expect("temporary directory");
        let archive = temporary.path().join("broken.tar.gz");
        let checksum = temporary.path().join("broken.tar.gz.sha256");
        fs::write(&archive, b"not an archive").expect("archive");
        fs::write(&checksum, format!("{}  broken.tar.gz\n", "0".repeat(64))).expect("checksum");
        let paths = InstallPaths::new(temporary.path().join("install"), temporary.path().join("bin")).expect("paths");
        let release = Release {
            version: "v1.0.0".into(),
            repository: "example/repository".into(),
            local_archive: Some(archive),
            local_checksum: Some(checksum),
        };

        let error = stage_release(&paths, release).await.expect_err("checksum mismatch");

        assert!(error.to_string().contains("checksum mismatch"));
        assert!(!paths.current().exists());
        assert!(fs::read_dir(paths.releases()).expect("staging directory").all(|entry| {
            entry
                .expect("entry")
                .file_name()
                .to_string_lossy()
                .starts_with(".staging-")
        }));
    }

    #[cfg(unix)]
    #[test]
    fn activation_and_pruning_use_canonical_release_paths() {
        let temporary = tempfile::TempDir::new().expect("temporary directory");
        let paths = InstallPaths::new(temporary.path().join("install"), temporary.path().join("bin")).expect("paths");
        let release = paths.releases().join("v1.0.0-linux-x86_64");
        fs::create_dir_all(&release).expect("release");
        for binary in binary_names() {
            fs::write(release.join(binary), []).expect("binary");
        }

        activate_release(&paths, &release).expect("activation");

        assert_eq!(
            current_release(&paths).expect("current"),
            Some(fs::canonicalize(&release).expect("canonical release"))
        );
        for binary in binary_names() {
            assert_eq!(
                fs::read_link(paths.bin().join(binary)).expect("visible link"),
                paths.current().join(binary)
            );
        }
        let stale = paths.releases().join("v0.9.0-linux-x86_64");
        fs::create_dir(&stale).expect("stale release");
        prune_releases(&paths, None).expect("prune releases");
        assert!(release.exists());
        assert!(!stale.exists());
    }
}
