//! Per-user storage paths, permissions, and single-daemon ownership.

use std::{
    env,
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
};

use crate::Error;

const ENVIRONMENT_VARIABLE: &str = "AGENT_HOME";

/// Root of one local Agent Control Plane.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ControlPlaneHome(PathBuf);

impl ControlPlaneHome {
    /// Resolves an explicit home, the environment override, or the per-user default.
    ///
    /// # Errors
    ///
    /// Returns an error when an absolute path or the per-user configuration directory cannot be resolved.
    pub fn resolve(configured: Option<&Path>) -> Result<Self, Error> {
        if let Some(path) = configured.filter(|path| !path.as_os_str().is_empty()) {
            return absolute(path).map(Self);
        }
        if let Some(path) = env::var_os(ENVIRONMENT_VARIABLE).filter(|value| !value.is_empty()) {
            return absolute(Path::new(&path)).map(Self);
        }
        default_home().map(Self)
    }

    /// Returns the resolved home path.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.0
    }

    /// Returns the fixed local API socket path.
    ///
    /// The socket lives in its own directory because Windows can leave a stale
    /// `AF_UNIX` socket file that cannot be deleted or rebound until reboot;
    /// recovery renames the directory aside, which works even then.
    #[must_use]
    pub fn socket_path(&self) -> PathBuf {
        self.0.join("run").join("agentd.sock")
    }

    /// Returns the daemon diagnostic log path used by automatic startup.
    #[must_use]
    pub fn daemon_log_path(&self) -> PathBuf {
        self.0.join("agentd.log")
    }

    /// Opens the automatic-start diagnostic log with user-only access.
    ///
    /// # Errors
    ///
    /// Returns an error when the log cannot be opened or secured.
    pub fn open_daemon_log(&self) -> Result<File, Error> {
        let path = self.daemon_log_path();
        let file = OpenOptions::new().create(true).append(true).open(&path)?;
        secure_file(&path)?;
        Ok(file)
    }

    /// Creates the home and restricts it to the current user.
    ///
    /// # Errors
    ///
    /// Returns an error when the directory cannot be created or secured.
    pub fn prepare(&self) -> Result<(), Error> {
        fs::create_dir_all(&self.0)?;
        secure_directory(&self.0)?;
        Ok(())
    }

    /// Acquires exclusive ownership of this control-plane home.
    ///
    /// # Errors
    ///
    /// Returns an error when the home cannot be prepared or another daemon owns its lock.
    pub fn acquire_lock(&self) -> Result<Lock, Error> {
        self.prepare()?;
        let path = self.0.join("agentd.lock");
        let file = OpenOptions::new()
            .create(true)
            .read(true)
            .write(true)
            .truncate(false)
            .open(&path)?;
        secure_file(&path)?;
        match file.try_lock() {
            Ok(()) => {}
            Err(std::fs::TryLockError::WouldBlock) => {
                return Err(Error::Io(std::io::Error::new(
                    std::io::ErrorKind::WouldBlock,
                    "control-plane home is already locked",
                )));
            }
            Err(std::fs::TryLockError::Error(error)) => return Err(Error::Io(error)),
        }
        Ok(Lock { _file: file })
    }
}

/// Held exclusive process lock for one local control-plane home.
#[derive(Debug)]
pub struct Lock {
    _file: File,
}

fn absolute(path: &Path) -> Result<PathBuf, Error> {
    if path.is_absolute() {
        Ok(path.to_path_buf())
    } else {
        Ok(env::current_dir()?.join(path))
    }
}

pub(crate) fn secure_directory(path: &Path) -> Result<(), Error> {
    secure_directory_for_host(path)
}

pub(crate) fn secure_file(path: &Path) -> Result<(), Error> {
    secure_file_for_host(path)
}

#[cfg(target_os = "windows")]
fn default_home() -> Result<PathBuf, Error> {
    // Not LOCALAPPDATA: endpoint-protection filters commonly applied to the
    // AppData tree can leave AF_UNIX sockets there unconnectable and their
    // files undeletable, which breaks the local API socket and Microsandbox.
    env::var_os("USERPROFILE")
        .map(|path| PathBuf::from(path).join(".agent"))
        .ok_or_else(|| Error::Invalid("USERPROFILE is not set".into()))
}

#[cfg(unix)]
fn default_home() -> Result<PathBuf, Error> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .map(|path| path.join(".agent"))
        .ok_or_else(|| Error::Invalid("HOME is not set".into()))
}

#[cfg(not(any(unix, target_os = "windows")))]
fn default_home() -> Result<PathBuf, Error> {
    Err(Error::Invalid("unsupported host operating system".into()))
}

#[cfg(unix)]
fn secure_directory_for_host(path: &Path) -> Result<(), Error> {
    use std::os::unix::fs::PermissionsExt as _;

    fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    Ok(())
}

#[cfg(unix)]
fn secure_file_for_host(path: &Path) -> Result<(), Error> {
    use std::os::unix::fs::PermissionsExt as _;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn secure_directory_for_host(path: &Path) -> Result<(), Error> {
    secure_windows_path(path, true)
}

#[cfg(target_os = "windows")]
fn secure_file_for_host(path: &Path) -> Result<(), Error> {
    secure_windows_path(path, false)
}

#[cfg(target_os = "windows")]
fn secure_windows_path(path: &Path, inherit: bool) -> Result<(), Error> {
    let user = env::var("USERNAME").map_err(|error| Error::Invalid(error.to_string()))?;
    let grant = if inherit {
        format!("{user}:(OI)(CI)F")
    } else {
        format!("{user}:F")
    };
    let mut command = std::process::Command::new("icacls");
    command
        .arg(path)
        .arg("/inheritance:r")
        .arg("/grant:r")
        .arg(grant)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());
    super::process::configure_hidden(&mut command);
    let status = command.status()?;
    if !status.success() {
        return Err(Error::Io(std::io::Error::other(format!(
            "icacls failed for {} with {status}",
            path.display()
        ))));
    }
    Ok(())
}

#[cfg(not(any(unix, target_os = "windows")))]
fn secure_directory_for_host(_path: &Path) -> Result<(), Error> {
    Err(Error::Invalid("unsupported host operating system".into()))
}

#[cfg(not(any(unix, target_os = "windows")))]
fn secure_file_for_host(_path: &Path) -> Result<(), Error> {
    Err(Error::Invalid("unsupported host operating system".into()))
}
