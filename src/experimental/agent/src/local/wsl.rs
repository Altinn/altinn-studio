//! The Windows host of a WSL distribution running `agentctl` and `agentd`.
//!
//! Under WSL the person's browser and editors run on Windows, so addresses
//! open there and editors need an OpenSSH configuration that Windows reads.
//! Everything here is detected once, through WSL interop; without interop
//! nothing can be started on Windows and the host is treated as plain Linux.

use std::{
    path::{Path, PathBuf},
    process::Command,
};

/// Exists while WSL can start Windows programs.
const INTEROP: &str = "/proc/sys/fs/binfmt_misc/WSLInterop";
/// Where `cmd.exe` is found when Windows directories are not on `PATH`.
const CMD: &str = "/mnt/c/Windows/System32/cmd.exe";

/// The Windows side of this WSL distribution.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Wsl {
    /// Distribution name, as `wsl.exe -d` takes it.
    pub distribution: String,
    /// The Windows user profile, as this distribution reaches it (`/mnt/c/Users/me`).
    pub profile: PathBuf,
    /// The same profile as Windows spells it, with forward slashes (`C:/Users/me`).
    pub windows_profile: String,
    /// The Windows user name, which file permissions are granted to.
    pub user: String,
    /// `wsl.exe` as Windows spells it, with forward slashes.
    pub wsl_exe: String,
}

impl Wsl {
    /// Whether this process runs in a WSL distribution that can start
    /// Windows programs. Cheap: reads the environment and one file.
    #[must_use]
    pub fn interop() -> bool {
        std::env::var_os("WSL_DISTRO_NAME").is_some_and(|name| !name.is_empty()) && Path::new(INTEROP).exists()
    }

    /// Detects the Windows side, asking Windows for the profile and user.
    /// Returns `None` outside WSL, without interop, or when Windows does not answer.
    #[must_use]
    pub fn detect() -> Option<Self> {
        if !Self::interop() {
            return None;
        }
        let distribution = std::env::var("WSL_DISTRO_NAME").ok()?;
        let cmd = which("cmd.exe").unwrap_or_else(|| PathBuf::from(CMD));
        // `cmd.exe` refuses a Linux working directory, so it runs from the Windows drive.
        let output = Command::new(cmd)
            .args(["/d", "/c", "echo %USERPROFILE%&echo %USERNAME%&echo %SystemRoot%"])
            .current_dir("/mnt/c")
            .output()
            .ok()?;
        let answer = String::from_utf8_lossy(&output.stdout);
        Self::from_answer(&distribution, &answer, |windows| {
            let output = Command::new("wslpath").args(["-u", windows]).output().ok()?;
            output
                .status
                .success()
                .then(|| PathBuf::from(String::from_utf8_lossy(&output.stdout).trim_end_matches(['\r', '\n'])))
        })
    }

    /// Builds the description from `cmd.exe`'s answer: profile, user and
    /// system root on their own lines, as Windows prints them.
    fn from_answer(distribution: &str, answer: &str, to_linux: impl Fn(&str) -> Option<PathBuf>) -> Option<Self> {
        let mut lines = answer.lines().map(|line| line.trim_end_matches('\r').trim());
        let (profile, user, system_root) = (lines.next()?, lines.next()?, lines.next()?);
        // An unset variable echoes as itself.
        if [profile, user, system_root]
            .iter()
            .any(|value| value.is_empty() || value.starts_with('%'))
        {
            return None;
        }
        Some(Self {
            distribution: distribution.to_owned(),
            profile: to_linux(profile)?,
            windows_profile: forward_slashes(profile),
            user: user.to_owned(),
            wsl_exe: format!("{}/System32/wsl.exe", forward_slashes(system_root)),
        })
    }

    /// Spells a path below the profile the way Windows does.
    #[must_use]
    pub fn windows_path(&self, below_profile: &Path) -> Option<String> {
        let relative = below_profile.strip_prefix(&self.profile).ok()?;
        let mut path = self.windows_profile.clone();
        for component in relative.components() {
            path.push('/');
            path.push_str(&component.as_os_str().to_string_lossy());
        }
        Some(path)
    }
}

fn forward_slashes(windows: &str) -> String {
    windows.replace('\\', "/")
}

/// Finds a program on `PATH`.
#[must_use]
pub fn which(name: &str) -> Option<PathBuf> {
    std::env::var_os("PATH")
        .map(|path| std::env::split_paths(&path).collect::<Vec<_>>())
        .unwrap_or_default()
        .into_iter()
        .filter(|directory| directory.is_absolute())
        .map(|directory| directory.join(name))
        .find(|candidate| candidate.is_file())
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    fn to_linux(windows: &str) -> Option<PathBuf> {
        let rest = windows.strip_prefix("C:\\")?;
        Some(PathBuf::from(format!("/mnt/c/{}", rest.replace('\\', "/"))))
    }

    #[test]
    fn the_windows_side_is_read_from_cmd_output() {
        let wsl = Wsl::from_answer("Ubuntu", "C:\\Users\\Ola Nordmann\r\nola\r\nC:\\WINDOWS\r\n", to_linux)
            .expect("detected");

        assert_eq!(wsl.distribution, "Ubuntu");
        assert_eq!(wsl.profile, PathBuf::from("/mnt/c/Users/Ola Nordmann"));
        assert_eq!(wsl.windows_profile, "C:/Users/Ola Nordmann");
        assert_eq!(wsl.user, "ola");
        assert_eq!(wsl.wsl_exe, "C:/WINDOWS/System32/wsl.exe");
        assert_eq!(
            wsl.windows_path(&wsl.profile.join(".agent/ssh/config")).as_deref(),
            Some("C:/Users/Ola Nordmann/.agent/ssh/config")
        );
        assert_eq!(wsl.windows_path(Path::new("/home/ola")), None);
    }

    #[test]
    fn unset_or_missing_answers_are_not_a_windows_side() {
        assert_eq!(
            Wsl::from_answer("Ubuntu", "%USERPROFILE%\r\nola\r\nC:\\WINDOWS\r\n", to_linux),
            None
        );
        assert_eq!(Wsl::from_answer("Ubuntu", "C:\\Users\\ola\r\n", to_linux), None);
        assert_eq!(
            Wsl::from_answer("Ubuntu", "C:\\Users\\ola\r\nola\r\nC:\\WINDOWS\r\n", |_| None),
            None
        );
    }
}
