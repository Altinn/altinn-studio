//! What the open menu offers for one Agent, and why an item is unavailable.
//!
//! The side panel's Connect section follows the same rules, so the panel never
//! promises something the menu then refuses.

use std::{
    path::{Path, PathBuf},
    process::Stdio,
    time::Duration,
};

use agent::{Agent, Condition, ConditionStatus};

use crate::launch::Editor;

/// Where the Agent's desktop is shown.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DesktopViewer {
    /// The browser-based viewer the image serves.
    Browser,
    /// A VNC client of the person's own.
    VncClient,
}

impl DesktopViewer {
    /// The guest port the viewer is served on.
    pub(crate) const fn guest_port(self) -> u16 {
        match self {
            Self::Browser => agent::vnc::WEB_GUEST_PORT,
            Self::VncClient => agent::vnc::GUEST_PORT,
        }
    }
}

/// One way into an Agent.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum OpenTarget {
    /// A login shell in the Sandbox, in this terminal.
    Shell,
    /// An editor on this machine, connected over SSH.
    Editor(Editor),
    /// The Agent's desktop, forwarded to this machine.
    Desktop(DesktopViewer),
    /// An OpenSSH login, in this terminal.
    SshShell,
    /// The OpenSSH alias, for tools outside the TUI.
    CopyAlias,
}

impl OpenTarget {
    pub(crate) fn label(self) -> String {
        match self {
            Self::Shell => "Shell in the Sandbox".into(),
            Self::Editor(Editor::VsCode) => "VS Code, Remote-SSH".into(),
            Self::Editor(editor) => editor.label().into(),
            Self::Desktop(DesktopViewer::Browser) => "Desktop in the browser".into(),
            Self::Desktop(DesktopViewer::VncClient) => "Desktop in a VNC client".into(),
            Self::SshShell => "SSH shell".into(),
            Self::CopyAlias => "Copy SSH alias".into(),
        }
    }

    /// The target as notices and the header name it, without the menu's detail.
    pub(crate) fn name(self) -> String {
        match self {
            Self::Editor(editor) => editor.label().into(),
            target => target.label(),
        }
    }

    /// The key that chooses the target directly in the menu.
    pub(crate) const fn key(self) -> char {
        match self {
            Self::Shell => 'e',
            Self::Editor(Editor::VsCode) => 'c',
            Self::Editor(Editor::Zed) => 'z',
            Self::Desktop(DesktopViewer::Browser) => 'w',
            Self::Desktop(DesktopViewer::VncClient) => 'v',
            Self::SshShell => 's',
            Self::CopyAlias => 'y',
        }
    }

    /// Whether the target reaches the Agent through the user's own OpenSSH
    /// configuration, which then needs the generated one included.
    pub(crate) const fn needs_include(self) -> bool {
        matches!(self, Self::Editor(_) | Self::CopyAlias)
    }
}

/// One row of the open menu: a way into the Agent, or the SSH setup editors need.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum MenuEntry {
    Open(OpenTarget),
    /// Adds the generated configuration's `Include` to the user's own.
    SetUpSsh,
}

impl MenuEntry {
    pub(crate) fn label(self) -> String {
        match self {
            Self::Open(target) => target.label(),
            Self::SetUpSsh => "Set up SSH".into(),
        }
    }

    pub(crate) const fn key(self) -> Option<char> {
        match self {
            Self::Open(target) => Some(target.key()),
            Self::SetUpSsh => None,
        }
    }
}

/// How long OpenSSH may take to resolve an alias; `Match exec` in the user's
/// configuration runs commands of theirs, which must not hold the check forever.
const SSH_CHECK_TIMEOUT: Duration = Duration::from_secs(5);

/// Whether the user's OpenSSH configuration reaches Agents through the generated one.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) enum SshSetup {
    /// Not checked yet, or OpenSSH could not tell: it is missing, timed out
    /// or rejects the configuration. Nothing is asked for then.
    #[default]
    Unknown,
    Installed,
    Missing,
}

impl SshSetup {
    /// Asks OpenSSH how the user's configuration resolves `agent`'s alias, as
    /// editors resolve it. `ssh -G` only prints the result and connects nowhere.
    pub(crate) async fn check(agent: &str) -> Self {
        Self::resolve(agent, None).await
    }

    /// [`Self::check`] against `config` in place of the user's configuration.
    async fn resolve(agent: &str, config: Option<&Path>) -> Self {
        let mut ssh = tokio::process::Command::new(crate::ssh_client_executable());
        if let Some(config) = config {
            ssh.arg("-F").arg(config);
        }
        ssh.arg("-G")
            .arg(agent::ssh::alias(agent))
            .stdin(Stdio::null())
            .stderr(Stdio::null())
            .kill_on_drop(true);
        match tokio::time::timeout(SSH_CHECK_TIMEOUT, ssh.output()).await {
            Ok(Ok(output)) if output.status.success() => {
                if agent::ssh::resolves_through_agentctl(&String::from_utf8_lossy(&output.stdout), agent) {
                    Self::Installed
                } else {
                    Self::Missing
                }
            }
            _ => Self::Unknown,
        }
    }
}

/// Facts about this machine the menu depends on, gathered when the TUI starts.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub(crate) struct Environment {
    /// Why an application started here would not appear in front of the
    /// person, when it would not.
    pub(crate) launch_blocked: Option<String>,
    /// Each editor's launcher found on `PATH`.
    pub(crate) launchers: Vec<(Editor, PathBuf)>,
}

impl Environment {
    pub(crate) fn detect() -> Self {
        let path = std::env::var_os("PATH");
        Self {
            launch_blocked: crate::launch::launch_blocked(|name| std::env::var_os(name)),
            launchers: Editor::ALL
                .into_iter()
                .filter_map(|editor| Some((editor, editor.locate(path.as_deref())?)))
                .collect(),
        }
    }

    pub(crate) fn launcher(&self, editor: Editor) -> Option<&Path> {
        self.launchers
            .iter()
            .find(|(found, _)| *found == editor)
            .map(|(_, path)| path.as_path())
    }
}

/// One row of the open menu.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct OpenItem {
    pub(crate) entry: MenuEntry,
    /// Why the item cannot be chosen.
    pub(crate) unavailable: Option<String>,
}

/// The open menu for one Agent, with its selected row.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct OpenMenu {
    pub(crate) agent: String,
    pub(crate) items: Vec<OpenItem>,
    pub(crate) selected: usize,
}

impl OpenMenu {
    pub(crate) fn new(agent: &Agent, environment: &Environment, setup: SshSetup) -> Self {
        let items = items(agent, environment, setup);
        let selected = items
            .iter()
            .position(|item| item.unavailable.is_none())
            .unwrap_or_default();
        Self {
            agent: agent.metadata.name.clone(),
            items,
            selected,
        }
    }

    /// Moves the selection by `delta` among the items that can be chosen.
    pub(crate) fn move_selection(&mut self, delta: isize) {
        let available = (0..self.items.len())
            .filter(|index| self.items[*index].unavailable.is_none())
            .collect::<Vec<_>>();
        let Some(current) = available.iter().position(|index| *index == self.selected) else {
            return;
        };
        let length = isize::try_from(available.len()).unwrap_or(1);
        let next = (isize::try_from(current).unwrap_or_default() + delta).rem_euclid(length);
        self.selected = available[usize::try_from(next).unwrap_or_default()];
    }

    /// The entry the selected row chooses, when it can be chosen.
    pub(crate) fn chosen(&self) -> Option<MenuEntry> {
        self.items
            .get(self.selected)
            .filter(|item| item.unavailable.is_none())
            .map(|item| item.entry)
    }

    /// The entry `key` chooses, when it can be chosen.
    pub(crate) fn by_key(&self, key: char) -> Option<MenuEntry> {
        self.items
            .iter()
            .find(|item| item.entry.key() == Some(key) && item.unavailable.is_none())
            .map(|item| item.entry)
    }

    /// Each reason an item is unavailable, once, with the labels of the items
    /// it applies to, in menu order.
    pub(crate) fn unavailable_reasons(&self) -> Vec<(Vec<String>, String)> {
        let mut reasons = Vec::<(Vec<String>, String)>::new();
        for item in &self.items {
            let Some(reason) = &item.unavailable else {
                continue;
            };
            match reasons.iter_mut().find(|(_, listed)| listed == reason) {
                Some((labels, _)) => labels.push(item.entry.label()),
                None => reasons.push((vec![item.entry.label()], reason.clone())),
            }
        }
        reasons
    }
}

/// Every item of the open menu for `agent`, in menu order.
pub(crate) fn items(agent: &Agent, environment: &Environment, setup: SshSetup) -> Vec<OpenItem> {
    let ssh = ssh_unavailable(agent);
    let open = |target, unavailable| OpenItem {
        entry: MenuEntry::Open(target),
        unavailable,
    };
    let mut items = vec![open(OpenTarget::Shell, None)];
    items.extend(Editor::ALL.into_iter().map(|editor| {
        open(
            OpenTarget::Editor(editor),
            ssh.clone().or_else(|| editor_unavailable(editor, environment)),
        )
    }));
    let desktop = vnc_unavailable(agent);
    items.extend(
        [DesktopViewer::Browser, DesktopViewer::VncClient]
            .map(|viewer| open(OpenTarget::Desktop(viewer), desktop.clone())),
    );
    items.extend([OpenTarget::SshShell, OpenTarget::CopyAlias].map(|target| open(target, ssh.clone())));
    if ssh.is_none() && setup == SshSetup::Missing {
        items.push(OpenItem {
            entry: MenuEntry::SetUpSsh,
            unavailable: None,
        });
    }
    items
}

/// The Agent's Connect section for the side panel: what the menu offers and
/// what stands in the way, without the rows' keys. `desktop` is the address
/// that opens a desktop forward this TUI holds open, if any.
pub(crate) fn connect_lines(
    agent: &Agent,
    environment: &Environment,
    setup: SshSetup,
    desktop: Option<&str>,
) -> Vec<String> {
    let mut lines = vec!["  shell      in this terminal".to_owned()];
    lines.push(match (vnc_unavailable(agent), desktop) {
        (Some(reason), _) => format!("  desktop    {reason}"),
        (None, Some(url)) => format!("  desktop    open at {url}"),
        (None, None) => "  desktop    browser · VNC client".to_owned(),
    });
    if let Some(reason) = ssh_unavailable(agent) {
        lines.push(format!("  ssh        {reason}"));
        return lines;
    }
    // VS Code needs no launcher of its own, so only a blocked launch leaves no editor.
    lines.push(environment.launch_blocked.as_ref().map_or_else(
        || {
            let editors = Editor::ALL
                .into_iter()
                .filter(|editor| editor_unavailable(*editor, environment).is_none())
                .map(Editor::label)
                .collect::<Vec<_>>();
            format!("  editors    {}", editors.join(" · "))
        },
        |reason| format!("  editors    none: {reason}"),
    ));
    if setup == SshSetup::Missing {
        lines.push("  ! SSH not set up; o offers it".to_owned());
    }
    lines.push(format!("  ssh alias  {}", agent::ssh::alias(&agent.metadata.name)));
    lines
}

/// Why nothing reached over SSH can be offered, if anything is in the way.
fn ssh_unavailable(agent: &Agent) -> Option<String> {
    access_unavailable(agent, agent.spec.ssh_access(), Condition::SSH_READY, "SSH access")
}

/// Why the desktop cannot be offered, if anything is in the way.
fn vnc_unavailable(agent: &Agent) -> Option<String> {
    access_unavailable(agent, agent.spec.vnc_access(), Condition::VNC_READY, "VNC access")
}

/// An access capability is unavailable while undeclared or after its last pass failed.
fn access_unavailable(agent: &Agent, declared: bool, condition: &str, what: &str) -> Option<String> {
    if !declared {
        return Some(format!("{what} is not declared in spec.access"));
    }
    agent
        .status
        .conditions
        .iter()
        .find(|found| found.kind == condition && found.status == ConditionStatus::False)
        .map(|found| format!("{what} is not ready: {}", found.detail().trim_end()))
}

fn editor_unavailable(editor: Editor, environment: &Environment) -> Option<String> {
    if let Some(reason) = &environment.launch_blocked {
        return Some(reason.clone());
    }
    if environment.launcher(editor).is_some() {
        return None;
    }
    editor.missing_launcher()
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    fn agent(access: &str) -> Agent {
        let yaml = format!(
            "apiVersion: agents.platform/v1alpha1\n\
             kind: Agent\n\
             metadata:\n\
             \x20 name: worker\n\
             spec:\n\
             \x20 sandbox:\n\
             \x20   image:\n\
             \x20     type: build\n\
             \x20     context: .\n\
             \x20     dockerfile: Dockerfile\n\
             \x20   platform:\n\
             \x20     os: linux\n\
             \x20   resources:\n\
             \x20     cpu: \"1\"\n\
             \x20     memory: \"1Gi\"\n\
             \x20     rootFilesystem:\n\
             \x20       capacity: \"8Gi\"\n\
             \x20       mode: layered\n\
             \x20 home:\n\
             \x20   source: home\n\
             \x20 harnesses:\n\
             \x20   - type: claudeCode\n\
             \x20     version: \"1.0.0\"\n\
             \x20     auth: mediated\n\
             \x20 secrets: []\n\
             {access}\
             \x20 network:\n\
             \x20   mode: mediated\n\
             \x20   allow: all\n"
        );
        agent::manifest::decode(yaml.as_bytes()).expect("test manifest")
    }

    fn with_ssh() -> Agent {
        agent("\x20 access:\n\x20   - type: ssh\n")
    }

    fn local(editors: &[Editor]) -> Environment {
        Environment {
            launch_blocked: None,
            launchers: editors
                .iter()
                .map(|editor| (*editor, PathBuf::from(format!("/opt/bin/{}", editor.label()))))
                .collect(),
        }
    }

    fn unavailable(items: &[OpenItem], target: OpenTarget) -> Option<String> {
        items
            .iter()
            .find(|item| item.entry == MenuEntry::Open(target))
            .expect("item is listed")
            .unavailable
            .clone()
    }

    #[test]
    fn an_agent_without_ssh_offers_only_its_shell() {
        let items = items(&agent(""), &local(&Editor::ALL), SshSetup::Missing);

        assert_eq!(unavailable(&items, OpenTarget::Shell), None);
        for target in [
            OpenTarget::Editor(Editor::VsCode),
            OpenTarget::SshShell,
            OpenTarget::CopyAlias,
        ] {
            assert_eq!(
                unavailable(&items, target).as_deref(),
                Some("SSH access is not declared in spec.access")
            );
        }
        assert!(items.iter().all(|item| item.entry != MenuEntry::SetUpSsh));
    }

    #[test]
    fn failed_ssh_access_names_its_cause() {
        let mut agent = with_ssh();
        agent.status.conditions.push(Condition {
            kind: Condition::SSH_READY.into(),
            status: ConditionStatus::False,
            reason: "ReconcileFailed".into(),
            message: "the image lacks sshd".into(),
            last_transition_time: None,
        });

        let items = items(&agent, &local(&Editor::ALL), SshSetup::Installed);

        assert_eq!(
            unavailable(&items, OpenTarget::SshShell).as_deref(),
            Some("SSH access is not ready: the image lacks sshd")
        );
    }

    #[test]
    fn editors_need_a_local_terminal_and_zed_its_launcher() {
        let without_launchers = items(&with_ssh(), &local(&[]), SshSetup::Installed);
        assert_eq!(
            unavailable(&without_launchers, OpenTarget::Editor(Editor::VsCode)),
            None
        );
        assert_eq!(
            unavailable(&without_launchers, OpenTarget::Editor(Editor::Zed)),
            Editor::Zed.missing_launcher()
        );

        let remote = Environment {
            launch_blocked: Some("this terminal has no display to open windows on".into()),
            ..local(&Editor::ALL)
        };
        let over_ssh = items(&with_ssh(), &remote, SshSetup::Installed);
        assert!(unavailable(&over_ssh, OpenTarget::Editor(Editor::VsCode)).is_some());
        assert_eq!(unavailable(&over_ssh, OpenTarget::CopyAlias), None);
        assert_eq!(unavailable(&over_ssh, OpenTarget::SshShell), None);
    }

    #[test]
    fn setting_up_ssh_is_offered_only_while_the_include_is_missing() {
        let environment = local(&Editor::ALL);
        for (setup, offered) in [
            (SshSetup::Missing, true),
            (SshSetup::Installed, false),
            (SshSetup::Unknown, false),
        ] {
            let listed = items(&with_ssh(), &environment, setup);
            assert_eq!(
                listed.iter().any(|item| item.entry == MenuEntry::SetUpSsh),
                offered,
                "{setup:?}"
            );
        }
    }

    #[test]
    fn the_menu_selects_and_chooses_only_available_items() {
        let mut menu = OpenMenu::new(&with_ssh(), &local(&[]), SshSetup::Installed);
        assert_eq!(menu.chosen(), Some(MenuEntry::Open(OpenTarget::Shell)));
        menu.move_selection(1);
        assert_eq!(menu.chosen(), Some(MenuEntry::Open(OpenTarget::Editor(Editor::VsCode))));
        // Zed has no launcher, so the selection passes over it.
        menu.move_selection(1);
        assert_eq!(menu.chosen(), Some(MenuEntry::Open(OpenTarget::SshShell)));
        menu.move_selection(-2);
        assert_eq!(menu.chosen(), Some(MenuEntry::Open(OpenTarget::Shell)));
        menu.move_selection(-1);
        assert_eq!(menu.chosen(), Some(MenuEntry::Open(OpenTarget::CopyAlias)));
        assert_eq!(menu.by_key('z'), None);
        assert_eq!(
            menu.by_key('c'),
            Some(MenuEntry::Open(OpenTarget::Editor(Editor::VsCode)))
        );
    }

    #[test]
    fn each_unavailable_reason_is_given_once_with_what_it_blocks() {
        let menu = OpenMenu::new(&agent(""), &local(&[]), SshSetup::Installed);
        assert_eq!(
            menu.unavailable_reasons(),
            [
                (
                    vec![
                        "VS Code, Remote-SSH".to_owned(),
                        "Zed".to_owned(),
                        "SSH shell".to_owned(),
                        "Copy SSH alias".to_owned()
                    ],
                    "SSH access is not declared in spec.access".to_owned()
                ),
                (
                    vec![
                        "Desktop in the browser".to_owned(),
                        "Desktop in a VNC client".to_owned()
                    ],
                    "VNC access is not declared in spec.access".to_owned()
                )
            ]
        );
        let menu = OpenMenu::new(&with_desktop(), &local(&[]), SshSetup::Installed);
        assert_eq!(
            menu.unavailable_reasons(),
            [(
                vec!["Zed".to_owned()],
                Editor::Zed.missing_launcher().expect("Zed needs a launcher")
            )]
        );
    }

    fn with_desktop() -> Agent {
        agent("\x20 access:\n\x20   - type: ssh\n\x20   - type: vnc\n")
    }

    #[test]
    fn the_desktop_is_offered_when_declared_and_ready() {
        let environment = local(&[]);
        let browser = OpenTarget::Desktop(DesktopViewer::Browser);
        assert_eq!(
            unavailable(&items(&with_ssh(), &environment, SshSetup::Installed), browser).as_deref(),
            Some("VNC access is not declared in spec.access")
        );
        assert_eq!(
            unavailable(&items(&with_desktop(), &environment, SshSetup::Installed), browser),
            None
        );

        let mut failed = with_desktop();
        failed.status.conditions.push(Condition {
            kind: Condition::VNC_READY.into(),
            status: ConditionStatus::False,
            reason: "ReconcileFailed".into(),
            message: "the image runs no desktop".into(),
            last_transition_time: None,
        });
        let listed = items(&failed, &environment, SshSetup::Installed);
        assert_eq!(
            unavailable(&listed, OpenTarget::Desktop(DesktopViewer::VncClient)).as_deref(),
            Some("VNC access is not ready: the image runs no desktop")
        );
        assert_eq!(unavailable(&listed, OpenTarget::SshShell), None, "SSH is unaffected");

        let menu = OpenMenu::new(&with_desktop(), &environment, SshSetup::Installed);
        assert_eq!(menu.by_key('w'), Some(MenuEntry::Open(browser)));
        assert_eq!(
            menu.by_key('v'),
            Some(MenuEntry::Open(OpenTarget::Desktop(DesktopViewer::VncClient)))
        );
    }

    #[test]
    fn the_panel_shows_an_open_desktop_where_it_listens() {
        let lines = connect_lines(&with_desktop(), &local(&[]), SshSetup::Installed, None);
        assert_eq!(lines[1], "  desktop    browser · VNC client");
        let lines = connect_lines(
            &with_desktop(),
            &local(&[]),
            SshSetup::Installed,
            Some("http://127.0.0.1:53817/"),
        );
        assert_eq!(lines[1], "  desktop    open at http://127.0.0.1:53817/");
    }

    #[test]
    fn connect_lines_agree_with_the_menu() {
        assert_eq!(
            connect_lines(&agent(""), &local(&Editor::ALL), SshSetup::Missing, None),
            [
                "  shell      in this terminal",
                "  desktop    VNC access is not declared in spec.access",
                "  ssh        SSH access is not declared in spec.access"
            ]
        );
        assert_eq!(
            connect_lines(&with_ssh(), &local(&[Editor::Zed]), SshSetup::Missing, None),
            [
                "  shell      in this terminal",
                "  desktop    VNC access is not declared in spec.access",
                "  editors    VS Code · Zed",
                "  ! SSH not set up; o offers it",
                "  ssh alias  agentctl-worker",
            ]
        );
        let remote = Environment {
            launch_blocked: Some("this terminal has no display to open windows on".into()),
            launchers: Vec::new(),
        };
        assert_eq!(
            connect_lines(&with_ssh(), &remote, SshSetup::Installed, None)[2],
            "  editors    none: this terminal has no display to open windows on"
        );
    }

    /// User configurations OpenSSH reads the generated one from, however they
    /// spell the `Include`; ones where it does not apply, since a block or a
    /// match of the user's own comes first; and one OpenSSH rejects.
    #[cfg(unix)]
    #[tokio::test(flavor = "local")]
    async fn ssh_setup_is_what_openssh_resolves_however_the_include_is_written() {
        if std::process::Command::new(crate::ssh_client_executable())
            .arg("-V")
            .output()
            .is_err()
        {
            eprintln!("skipped: no OpenSSH client");
            return;
        }
        let directory = tempfile::tempdir().expect("temporary directory");
        let generated = directory.path().join("generated").join("config");
        std::fs::create_dir_all(generated.parent().expect("parent")).expect("directory");
        let proxy = agent::ssh::render_proxy_command(
            Path::new("/usr/local/bin/agentctl"),
            "worker",
            agent::ssh::CommandShell::Posix,
        )
        .expect("proxy command");
        std::fs::write(&generated, format!("Host agentctl-worker\n    ProxyCommand {proxy}\n")).expect("generated");
        let path = generated.display().to_string();
        let glob = generated.with_file_name("*").display().to_string();
        let cases = [
            (format!("Include {path}\n"), SshSetup::Installed),
            (format!("include {path}\n"), SshSetup::Installed),
            (format!("Include={path}\n"), SshSetup::Installed),
            (format!("Include \"{path}\" # agentctl\n"), SshSetup::Installed),
            (format!("Include {glob}\n"), SshSetup::Installed),
            (format!("Include /nonexistent {path}\n"), SshSetup::Installed),
            (
                format!("Host *\n    ServerAliveInterval 30\n\nInclude {path}\n"),
                SshSetup::Installed,
            ),
            (
                format!("Host github.com\n    User git\n\nInclude {path}\n"),
                SshSetup::Missing,
            ),
            (
                format!("Host agentctl-*\n    ProxyCommand none\n\nInclude {path}\n"),
                SshSetup::Missing,
            ),
            (String::new(), SshSetup::Missing),
            ("Bogus yes\n".to_owned(), SshSetup::Unknown),
        ];
        for (text, expected) in cases {
            let user = directory.path().join("user_config");
            std::fs::write(&user, &text).expect("user config");
            assert_eq!(SshSetup::resolve("worker", Some(&user)).await, expected, "{text}");
        }
    }
}
