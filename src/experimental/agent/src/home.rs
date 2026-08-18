//! Per-user storage and single-daemon ownership for the local control plane.

use std::{
    env,
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
};

use crate::Error;

const ENVIRONMENT_VARIABLE: &str = "ALTINN_AGENT_HOME";

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
        user_config_directory().map(|path| Self(path.join("altinn").join("agent-platform")))
    }

    /// Returns the resolved home path.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.0
    }

    /// Returns the fixed local API socket path.
    #[must_use]
    pub fn socket_path(&self) -> PathBuf {
        self.0.join("agentd.sock")
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

#[cfg(target_os = "windows")]
fn user_config_directory() -> Result<PathBuf, Error> {
    env::var_os("APPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| Error::Invalid("APPDATA is not set".into()))
}

#[cfg(target_os = "macos")]
fn user_config_directory() -> Result<PathBuf, Error> {
    home_directory().map(|path| path.join("Library").join("Application Support"))
}

#[cfg(all(unix, not(target_os = "macos")))]
fn user_config_directory() -> Result<PathBuf, Error> {
    if let Some(path) = env::var_os("XDG_CONFIG_HOME").filter(|value| !value.is_empty()) {
        return Ok(PathBuf::from(path));
    }
    home_directory().map(|path| path.join(".config"))
}

#[cfg(not(any(unix, target_os = "windows")))]
fn user_config_directory() -> Result<PathBuf, Error> {
    Err(Error::Invalid("unsupported host operating system".into()))
}

#[cfg(any(target_os = "macos", all(unix, not(target_os = "macos"))))]
fn home_directory() -> Result<PathBuf, Error> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| Error::Invalid("HOME is not set".into()))
}

#[cfg(unix)]
pub(crate) fn secure_directory(path: &Path) -> Result<(), Error> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    Ok(())
}

#[cfg(unix)]
pub(crate) fn secure_file(path: &Path) -> Result<(), Error> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    Ok(())
}

#[cfg(target_os = "windows")]
pub(crate) fn secure_directory(path: &Path) -> Result<(), Error> {
    secure_windows_path(path, true)
}

#[cfg(target_os = "windows")]
pub(crate) fn secure_file(path: &Path) -> Result<(), Error> {
    secure_windows_path(path, false)
}

#[cfg(target_os = "windows")]
fn secure_windows_path(path: &Path, inherit: bool) -> Result<(), Error> {
    use std::os::windows::process::CommandExt as _;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let user = env::var("USERNAME").map_err(|error| Error::Invalid(error.to_string()))?;
    let grant = if inherit {
        format!("{user}:(OI)(CI)F")
    } else {
        format!("{user}:F")
    };
    let status = std::process::Command::new("icacls")
        .arg(path)
        .arg("/inheritance:r")
        .arg("/grant:r")
        .arg(grant)
        .creation_flags(CREATE_NO_WINDOW)
        .status()?;
    if !status.success() {
        return Err(Error::Io(std::io::Error::other(format!(
            "icacls failed for {} with {status}",
            path.display()
        ))));
    }
    Ok(())
}

#[cfg(not(any(unix, target_os = "windows")))]
pub(crate) fn secure_directory(_path: &Path) -> Result<(), Error> {
    Err(Error::Invalid("unsupported host operating system".into()))
}

#[cfg(not(any(unix, target_os = "windows")))]
pub(crate) fn secure_file(_path: &Path) -> Result<(), Error> {
    Err(Error::Invalid("unsupported host operating system".into()))
}
