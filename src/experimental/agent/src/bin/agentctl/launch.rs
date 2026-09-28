//! Hands addresses and editor sessions to applications on the machine running `agentctl`.
//!
//! Everything here is best effort: no portable viewer or editor exists, so a
//! launch that cannot happen is reported to the caller, which already shows
//! the address or alias it tried to open.

use std::{
    ffi::{OsStr, OsString},
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

/// An editor that opens an Agent's working directory over SSH.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum Editor {
    VsCode,
    Zed,
}

impl Editor {
    pub(crate) const ALL: [Self; 2] = [Self::VsCode, Self::Zed];

    pub(crate) const fn label(self) -> &'static str {
        match self {
            Self::VsCode => "VS Code",
            Self::Zed => "Zed",
        }
    }

    /// Executable names the editor's command-line launcher is installed as, most common first.
    /// Some distribution packages install Zed's as `zeditor`. Under WSL the editor runs on
    /// Windows: Zed's Windows launcher is reached through interop, and VS Code's WSL `code`
    /// would open VS Code attached to WSL rather than to the Agent, so VS Code uses its URL.
    const fn executables(self, wsl: bool) -> &'static [&'static str] {
        match self {
            Self::VsCode if wsl => &[],
            Self::VsCode if cfg!(windows) => &["code.cmd"],
            Self::VsCode => &["code"],
            Self::Zed if wsl || cfg!(windows) => &["zed.exe"],
            Self::Zed => &["zed", "zeditor"],
        }
    }

    /// Finds the editor's launcher on `path`, a `PATH`-style variable.
    pub(crate) fn locate(self, path: Option<&OsStr>, wsl: bool) -> Option<PathBuf> {
        let directories = path
            .map(std::env::split_paths)
            .into_iter()
            .flatten()
            .collect::<Vec<_>>();
        self.executables(wsl).iter().find_map(|name| {
            directories
                .iter()
                .filter(|directory| directory.is_absolute())
                .map(|directory| directory.join(name))
                .find(|candidate| candidate.is_file())
        })
    }

    /// How to open `directory` in the Agent reached as the OpenSSH `alias`, given the launcher
    /// found on `PATH`. VS Code falls back to its URL handler; Zed has none to fall back to.
    pub(crate) fn launch(self, launcher: Option<&Path>, alias: &str, directory: &str) -> Option<Launch> {
        match (self, launcher) {
            (Self::VsCode, Some(program)) => Some(Launch::Command {
                program: program.to_path_buf(),
                arguments: vec!["--remote".into(), format!("ssh-remote+{alias}"), directory.to_owned()],
            }),
            (Self::VsCode, None) => Some(Launch::Url(format!(
                "vscode://vscode-remote/ssh-remote+{alias}{directory}"
            ))),
            (Self::Zed, Some(program)) => Some(Launch::Command {
                program: program.to_path_buf(),
                arguments: vec![format!("ssh://{alias}{directory}")],
            }),
            (Self::Zed, None) => None,
        }
    }

    /// Why the editor cannot be launched without its command-line launcher, if it needs one.
    pub(crate) fn missing_launcher(self, wsl: bool) -> Option<String> {
        match self {
            Self::VsCode => None,
            Self::Zed => Some(format!("not found on PATH ({})", self.executables(wsl).join(", "))),
        }
    }
}

/// One way to hand something to a local application.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum Launch {
    /// Runs a program with arguments, detached from the terminal.
    Command { program: PathBuf, arguments: Vec<String> },
    /// Opens an address with whichever application handles its scheme.
    Url(String),
}

impl Launch {
    /// Starts the launch without waiting for the application, whose output
    /// would otherwise land on the terminal the caller owns.
    ///
    /// # Errors
    ///
    /// Returns a description of why the program or opener could not be started.
    pub(crate) fn start(&self) -> Result<(), String> {
        match self {
            Self::Command { program, arguments } => spawn_detached(program.as_os_str(), arguments),
            Self::Url(url) => open_url(url),
        }
    }
}

/// Hands `url` to the program that opens addresses where the person works.
///
/// # Errors
///
/// Returns a description of why the opener could not be started.
pub(crate) fn open_url(url: &str) -> Result<(), String> {
    spawn_detached(opener().as_os_str(), &[url.to_owned()])
}

/// The program that opens addresses where the person works: under WSL that
/// is the Windows host, through `wslview` when installed or else Explorer.
pub(crate) fn opener() -> PathBuf {
    if cfg!(target_os = "macos") {
        PathBuf::from("open")
    } else if cfg!(target_os = "windows") {
        PathBuf::from("explorer")
    } else if agent::local::wsl::Wsl::interop() {
        agent::local::wsl::which("wslview")
            .or_else(|| agent::local::wsl::which("explorer.exe"))
            .unwrap_or_else(|| PathBuf::from("/mnt/c/Windows/explorer.exe"))
    } else {
        PathBuf::from("xdg-open")
    }
}

fn spawn_detached(program: &OsStr, arguments: &[String]) -> Result<(), String> {
    let mut child = Command::new(program)
        .args(arguments)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("could not run {}: {error}", program.to_string_lossy()))?;
    // Reaped in the background, so a launcher that exits leaves no zombie behind.
    std::thread::spawn(move || child.wait());
    Ok(())
}

/// Whether this terminal is reached over SSH, so applications started here
/// would open on a machine other than the one the person is looking at.
pub(crate) fn remote_terminal(variable: impl Fn(&str) -> Option<OsString>) -> bool {
    ["SSH_CONNECTION", "SSH_TTY"]
        .into_iter()
        .any(|name| variable(name).is_some_and(|value| !value.is_empty()))
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    #[test]
    fn vs_code_uses_its_launcher_or_else_its_url_handler() {
        let launcher = Path::new("/opt/bin/code");
        assert_eq!(
            Editor::VsCode.launch(Some(launcher), "agentctl-worker", "/srv/work"),
            Some(Launch::Command {
                program: launcher.to_path_buf(),
                arguments: vec![
                    "--remote".into(),
                    "ssh-remote+agentctl-worker".into(),
                    "/srv/work".into()
                ],
            })
        );
        assert_eq!(
            Editor::VsCode.launch(None, "agentctl-worker", "/srv/work"),
            Some(Launch::Url(
                "vscode://vscode-remote/ssh-remote+agentctl-worker/srv/work".into()
            ))
        );
        assert_eq!(Editor::VsCode.missing_launcher(false), None);
    }

    #[test]
    fn zed_needs_its_launcher() {
        let launcher = Path::new("/opt/bin/zeditor");
        assert_eq!(
            Editor::Zed.launch(Some(launcher), "agentctl-worker", "/srv/work"),
            Some(Launch::Command {
                program: launcher.to_path_buf(),
                arguments: vec!["ssh://agentctl-worker/srv/work".into()],
            })
        );
        assert_eq!(Editor::Zed.launch(None, "agentctl-worker", "/srv/work"), None);
        assert!(Editor::Zed.missing_launcher(false).is_some());
        assert_eq!(
            Editor::Zed.missing_launcher(true).as_deref(),
            Some("not found on PATH (zed.exe)")
        );
    }

    #[cfg(unix)]
    #[test]
    fn launchers_are_found_under_any_of_their_names_in_path_order() {
        let first = tempfile::tempdir().expect("directory");
        let second = tempfile::tempdir().expect("directory");
        std::fs::write(second.path().join("zeditor"), "").expect("zeditor");
        let path = std::env::join_paths([first.path(), Path::new("relative"), second.path()]).expect("PATH");

        assert_eq!(
            Editor::Zed.locate(Some(&path), false),
            Some(second.path().join("zeditor"))
        );
        std::fs::write(first.path().join("zed"), "").expect("zed");
        assert_eq!(Editor::Zed.locate(Some(&path), false), Some(first.path().join("zed")));
        assert_eq!(Editor::VsCode.locate(Some(&path), false), None);
        assert_eq!(Editor::VsCode.locate(None, false), None);
    }

    #[cfg(unix)]
    #[test]
    fn under_wsl_editors_are_the_windows_ones() {
        let windows = tempfile::tempdir().expect("directory");
        std::fs::write(windows.path().join("zed.exe"), "").expect("zed.exe");
        std::fs::write(windows.path().join("code"), "").expect("WSL code shim");
        std::fs::write(windows.path().join("zed"), "").expect("Linux zed");
        let path = std::env::join_paths([windows.path()]).expect("PATH");

        assert_eq!(
            Editor::Zed.locate(Some(&path), true),
            Some(windows.path().join("zed.exe"))
        );
        assert_eq!(
            Editor::VsCode.locate(Some(&path), true),
            None,
            "VS Code opens through its URL"
        );
    }

    #[test]
    fn a_terminal_reached_over_ssh_is_remote() {
        let only = |name: &'static str, value: &'static str| {
            move |variable: &str| (variable == name).then(|| OsString::from(value))
        };
        assert!(remote_terminal(only("SSH_CONNECTION", "10.0.0.1 5000 10.0.0.2 22")));
        assert!(remote_terminal(only("SSH_TTY", "/dev/pts/1")));
        assert!(!remote_terminal(only("SSH_TTY", "")));
        assert!(!remote_terminal(|_: &str| None));
    }
}
