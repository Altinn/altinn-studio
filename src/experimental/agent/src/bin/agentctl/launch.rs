//! Hands addresses and editor sessions to applications on the machine running `agentctl`.
//!
//! Everything here is best effort: no portable viewer or editor exists. A
//! launcher that fails at once is reported; one that fails later, after it
//! has handed over to the application, cannot be observed.

use std::{
    ffi::{OsStr, OsString},
    path::{Path, PathBuf},
    process::Stdio,
    time::Duration,
};

/// How long a launcher gets to fail before it is taken to have launched.
const LAUNCH_GRACE: Duration = Duration::from_secs(2);

/// Windows `CREATE_NO_WINDOW`: a console launcher such as `code.cmd` opens no console window.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

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
    /// Some distribution packages install Zed's as `zeditor`.
    const fn executables(self) -> &'static [&'static str] {
        match self {
            Self::VsCode if cfg!(windows) => &["code.cmd"],
            Self::VsCode => &["code"],
            Self::Zed if cfg!(windows) => &["zed.exe"],
            Self::Zed => &["zed", "zeditor"],
        }
    }

    /// Finds the editor's launcher on `path`, a `PATH`-style variable.
    pub(crate) fn locate(self, path: Option<&OsStr>) -> Option<PathBuf> {
        let directories = path
            .map(std::env::split_paths)
            .into_iter()
            .flatten()
            .collect::<Vec<_>>();
        self.executables().iter().find_map(|name| {
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
    pub(crate) fn missing_launcher(self) -> Option<String> {
        match self {
            Self::VsCode => None,
            Self::Zed => Some(format!("not found on PATH ({})", self.executables().join(", "))),
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
    /// Starts the launch, detached from the caller's terminal, and waits
    /// briefly for it to fail.
    ///
    /// # Errors
    ///
    /// Returns why the program could not be started or failed at once, such as
    /// an opener finding no application for the address.
    pub(crate) async fn start(&self) -> Result<(), String> {
        match self {
            Self::Command { program, arguments } => run_detached(program.as_os_str(), arguments).await,
            Self::Url(url) => open_url(url).await,
        }
    }
}

/// Hands `url` to the program that opens addresses on this operating system.
///
/// # Errors
///
/// Returns why the opener could not be started or failed at once.
pub(crate) async fn open_url(url: &str) -> Result<(), String> {
    run_detached(OsStr::new(opener()), &[url.to_owned()]).await
}

/// The program that opens addresses on this operating system.
pub(crate) const fn opener() -> &'static str {
    if cfg!(target_os = "macos") {
        "open"
    } else if cfg!(target_os = "windows") {
        "explorer"
    } else {
        "xdg-open"
    }
}

/// Runs a launcher outside the caller's terminal: its output is discarded,
/// and it gets a process group of its own, so closing the terminal does not
/// close the application. One still running after [`LAUNCH_GRACE`] is taken
/// to have launched and is left running; Tokio reaps it when it exits.
async fn run_detached(program: &OsStr, arguments: &[String]) -> Result<(), String> {
    let name = program.to_string_lossy();
    let mut command = tokio::process::Command::new(program);
    command
        .args(arguments)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(unix)]
    command.process_group(0);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let mut child = command
        .spawn()
        .map_err(|error| format!("could not run {name}: {error}"))?;
    match tokio::time::timeout(LAUNCH_GRACE, child.wait()).await {
        Ok(Ok(status)) if !status.success() => Err(format!("{name} failed ({status})")),
        Ok(Err(error)) => Err(format!("could not wait for {name}: {error}")),
        Ok(Ok(_)) | Err(_) => Ok(()),
    }
}

/// The address that opens a forward listening at `local` to `guest_port`: a
/// VNC client for the desktop's RFB port, a browser for anything else.
pub(crate) fn forward_url(local: impl std::fmt::Display, guest_port: u16) -> String {
    if guest_port == agent::vnc::GUEST_PORT {
        format!("vnc://{local}")
    } else {
        format!("http://{local}/")
    }
}

/// Names a forward to one of the desktop's ports, however it was made.
pub(crate) const fn forward_label(guest_port: u16) -> Option<&'static str> {
    match guest_port {
        agent::vnc::WEB_GUEST_PORT => Some("desktop"),
        agent::vnc::GUEST_PORT => Some("vnc"),
        _ => None,
    }
}

/// Why an application started here would not appear in front of the person,
/// when it would not. `AGENTCTL_OPEN=launch` or `copy` overrides the guess.
///
/// On Linux a window needs a display; that also covers `ssh -X` and remote
/// shells that are not SSH. macOS and Windows have no display variable, and
/// open windows on the machine's own screen, so there a terminal reached over
/// SSH is taken to be elsewhere.
pub(crate) fn launch_blocked(variable: impl Fn(&str) -> Option<OsString>) -> Option<String> {
    let set = |name: &str| variable(name).is_some_and(|value| !value.is_empty());
    match variable("AGENTCTL_OPEN").as_deref().and_then(OsStr::to_str) {
        Some("launch") => return None,
        Some("copy") => return Some("AGENTCTL_OPEN=copy asks to copy instead of opening".into()),
        _ => {}
    }
    if cfg!(any(target_os = "macos", windows)) {
        (set("SSH_CONNECTION") || set("SSH_TTY"))
            .then(|| "this terminal is reached over SSH, so it would open on that machine".into())
    } else {
        (!set("DISPLAY") && !set("WAYLAND_DISPLAY")).then(|| "this terminal has no display to open windows on".into())
    }
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
        assert_eq!(Editor::VsCode.missing_launcher(), None);
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
        assert!(Editor::Zed.missing_launcher().is_some());
    }

    #[cfg(unix)]
    #[test]
    fn launchers_are_found_under_any_of_their_names_in_path_order() {
        let first = tempfile::tempdir().expect("directory");
        let second = tempfile::tempdir().expect("directory");
        std::fs::write(second.path().join("zeditor"), "").expect("zeditor");
        let path = std::env::join_paths([first.path(), Path::new("relative"), second.path()]).expect("PATH");

        assert_eq!(Editor::Zed.locate(Some(&path)), Some(second.path().join("zeditor")));
        std::fs::write(first.path().join("zed"), "").expect("zed");
        assert_eq!(Editor::Zed.locate(Some(&path)), Some(first.path().join("zed")));
        assert_eq!(Editor::VsCode.locate(Some(&path)), None);
        assert_eq!(Editor::VsCode.locate(None), None);
    }

    fn only(pairs: &'static [(&'static str, &'static str)]) -> impl Fn(&str) -> Option<OsString> {
        move |variable: &str| {
            pairs
                .iter()
                .find(|(name, _)| *name == variable)
                .map(|(_, value)| OsString::from(value))
        }
    }

    #[test]
    fn forwards_open_in_the_application_for_their_guest_port() {
        assert_eq!(forward_url("127.0.0.1:53817", 5900), "vnc://127.0.0.1:53817");
        assert_eq!(forward_url("127.0.0.1:53817", 6080), "http://127.0.0.1:53817/");
    }

    #[test]
    fn forwards_to_the_desktop_are_named_by_their_port() {
        assert_eq!(forward_label(6080), Some("desktop"));
        assert_eq!(forward_label(5900), Some("vnc"));
        assert_eq!(forward_label(3000), None);
    }

    #[test]
    fn the_override_decides_whatever_the_terminal() {
        assert_eq!(launch_blocked(only(&[("AGENTCTL_OPEN", "launch")])), None);
        assert!(
            launch_blocked(only(&[("AGENTCTL_OPEN", "copy"), ("DISPLAY", ":0")]))
                .is_some_and(|reason| reason.contains("AGENTCTL_OPEN=copy"))
        );
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    #[test]
    fn on_linux_a_window_needs_a_display_whether_or_not_ssh_is_involved() {
        assert_eq!(launch_blocked(only(&[("DISPLAY", ":0")])), None);
        assert_eq!(launch_blocked(only(&[("WAYLAND_DISPLAY", "wayland-0")])), None);
        assert_eq!(
            launch_blocked(only(&[("DISPLAY", "localhost:10.0"), ("SSH_TTY", "/dev/pts/1")])),
            None,
            "ssh -X shows windows on the person's own screen"
        );
        assert!(launch_blocked(only(&[("SSH_TTY", "/dev/pts/1")])).is_some());
        assert!(launch_blocked(only(&[("DISPLAY", "")])).is_some());
    }

    #[cfg(any(target_os = "macos", windows))]
    #[test]
    fn elsewhere_a_terminal_reached_over_ssh_is_somewhere_else() {
        assert!(launch_blocked(only(&[("SSH_CONNECTION", "10.0.0.1 5000 10.0.0.2 22")])).is_some());
        assert_eq!(launch_blocked(only(&[])), None);
    }

    #[cfg(unix)]
    #[tokio::test(flavor = "local")]
    async fn a_launcher_that_fails_at_once_is_reported_and_one_that_runs_is_launched() {
        assert!(run_detached(OsStr::new("false"), &[]).await.is_err());
        assert_eq!(run_detached(OsStr::new("true"), &[]).await, Ok(()));
        assert_eq!(
            run_detached(OsStr::new("sleep"), &["5".into()]).await,
            Ok(()),
            "still running after the grace period"
        );
        assert!(
            run_detached(OsStr::new("agentctl-no-such-launcher"), &[])
                .await
                .is_err_and(|error| error.starts_with("could not run"))
        );
    }
}
