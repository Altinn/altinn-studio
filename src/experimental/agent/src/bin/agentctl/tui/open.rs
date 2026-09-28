//! What the open menu offers for one Agent, and why an item is unavailable.
//!
//! The side panel's Connect section reads the same items, so the panel never
//! promises something the menu then refuses.

use std::path::{Path, PathBuf};

use agent::{Agent, Condition, ConditionStatus};

use crate::launch::Editor;

/// One way into an Agent the open menu offers.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum OpenTarget {
    /// A login shell in the Sandbox, in this terminal.
    Shell,
    /// An editor on this machine, connected over SSH.
    Editor(Editor),
    /// An OpenSSH login, in this terminal.
    SshShell,
    /// The OpenSSH alias, for tools outside the TUI.
    CopyAlias,
    /// Adds the generated configuration's `Include` to the user's own.
    SetUpSsh,
}

impl OpenTarget {
    pub(crate) fn label(self) -> String {
        match self {
            Self::Shell => "Shell in the Sandbox".into(),
            Self::Editor(Editor::VsCode) => "VS Code, Remote-SSH".into(),
            Self::Editor(editor) => editor.label().into(),
            Self::SshShell => "SSH shell".into(),
            Self::CopyAlias => "Copy SSH alias".into(),
            Self::SetUpSsh => "Set up SSH for editors".into(),
        }
    }

    /// The key that chooses the item directly in the menu.
    pub(crate) const fn key(self) -> Option<char> {
        match self {
            Self::Shell => Some('e'),
            Self::Editor(Editor::VsCode) => Some('c'),
            Self::Editor(Editor::Zed) => Some('z'),
            Self::SshShell => Some('s'),
            Self::CopyAlias => Some('y'),
            Self::SetUpSsh => None,
        }
    }

    /// Whether the target reaches the Agent through the user's own OpenSSH
    /// configuration, which then needs the generated one included.
    pub(crate) const fn needs_include(self) -> bool {
        matches!(self, Self::Editor(_) | Self::CopyAlias)
    }
}

/// Whether the user's OpenSSH configuration includes the generated one.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(crate) enum SshSetup {
    /// Not checked yet, or the configuration could not be read.
    #[default]
    Unknown,
    Installed,
    Missing,
}

/// Facts about this machine the menu depends on, gathered when the TUI starts.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub(crate) struct Environment {
    /// The terminal is reached over SSH, so applications would open elsewhere.
    pub(crate) remote: bool,
    /// Each editor's launcher found on `PATH`.
    pub(crate) launchers: Vec<(Editor, PathBuf)>,
}

impl Environment {
    pub(crate) fn detect() -> Self {
        let path = std::env::var_os("PATH");
        Self {
            remote: crate::launch::remote_terminal(|name| std::env::var_os(name)),
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
    pub(crate) target: OpenTarget,
    /// Why the item cannot be chosen, shown in its place.
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

    /// The target the selected row opens, when it can be chosen.
    pub(crate) fn chosen(&self) -> Option<OpenTarget> {
        self.items
            .get(self.selected)
            .filter(|item| item.unavailable.is_none())
            .map(|item| item.target)
    }

    /// The target of the item `key` chooses, when it can be chosen.
    pub(crate) fn by_key(&self, key: char) -> Option<OpenTarget> {
        self.items
            .iter()
            .find(|item| item.target.key() == Some(key) && item.unavailable.is_none())
            .map(|item| item.target)
    }
}

/// Every item of the open menu for `agent`, in menu order.
pub(crate) fn items(agent: &Agent, environment: &Environment, setup: SshSetup) -> Vec<OpenItem> {
    let ssh = ssh_unavailable(agent);
    let mut items = vec![OpenItem {
        target: OpenTarget::Shell,
        unavailable: None,
    }];
    items.extend(Editor::ALL.into_iter().map(|editor| OpenItem {
        target: OpenTarget::Editor(editor),
        unavailable: ssh.clone().or_else(|| editor_unavailable(editor, environment)),
    }));
    items.extend([OpenTarget::SshShell, OpenTarget::CopyAlias].map(|target| OpenItem {
        target,
        unavailable: ssh.clone(),
    }));
    if ssh.is_none() && setup == SshSetup::Missing {
        items.push(OpenItem {
            target: OpenTarget::SetUpSsh,
            unavailable: None,
        });
    }
    items
}

/// The Agent's Connect section for the side panel: what the menu offers and
/// what stands in the way, without the rows' keys.
pub(crate) fn connect_lines(agent: &Agent, environment: &Environment, setup: SshSetup) -> Vec<String> {
    let mut lines = vec!["  shell      in this terminal".to_owned()];
    if let Some(reason) = ssh_unavailable(agent) {
        lines.push(format!("  ssh        {reason}"));
        return lines;
    }
    let editors = Editor::ALL
        .into_iter()
        .filter(|editor| editor_unavailable(*editor, environment).is_none())
        .map(Editor::label)
        .collect::<Vec<_>>();
    lines.push(match (editors.is_empty(), environment.remote) {
        (_, true) => "  editors    none: this terminal is reached over SSH".to_owned(),
        (true, false) => "  editors    none found on this machine".to_owned(),
        (false, false) => format!("  editors    {}", editors.join(" · ")),
    });
    if setup == SshSetup::Missing {
        lines.push("  ! editors need SSH set up; o offers it".to_owned());
    }
    lines.push(format!("  ssh alias  {}", agent::ssh::alias(&agent.metadata.name)));
    lines
}

/// Why nothing reached over SSH can be offered, if anything is in the way.
fn ssh_unavailable(agent: &Agent) -> Option<String> {
    if !agent.spec.ssh_access() {
        return Some("SSH access is not declared in spec.access".into());
    }
    agent
        .status
        .conditions
        .iter()
        .find(|condition| condition.kind == Condition::SSH_READY && condition.status == ConditionStatus::False)
        .map(|condition| format!("SSH access is not ready: {}", condition.detail().trim_end()))
}

fn editor_unavailable(editor: Editor, environment: &Environment) -> Option<String> {
    if environment.remote {
        return Some("this terminal is reached over SSH, so the editor would open on that machine".into());
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
            remote: false,
            launchers: editors
                .iter()
                .map(|editor| (*editor, PathBuf::from(format!("/opt/bin/{}", editor.label()))))
                .collect(),
        }
    }

    fn unavailable(items: &[OpenItem], target: OpenTarget) -> Option<String> {
        items
            .iter()
            .find(|item| item.target == target)
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
        assert!(items.iter().all(|item| item.target != OpenTarget::SetUpSsh));
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
        assert!(
            unavailable(&without_launchers, OpenTarget::Editor(Editor::Zed))
                .is_some_and(|reason| reason.contains("zeditor"))
        );

        let remote = Environment {
            remote: true,
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
                listed.iter().any(|item| item.target == OpenTarget::SetUpSsh),
                offered,
                "{setup:?}"
            );
        }
    }

    #[test]
    fn the_menu_selects_and_chooses_only_available_items() {
        let mut menu = OpenMenu::new(&with_ssh(), &local(&[]), SshSetup::Installed);
        assert_eq!(menu.chosen(), Some(OpenTarget::Shell));
        menu.move_selection(1);
        assert_eq!(menu.chosen(), Some(OpenTarget::Editor(Editor::VsCode)));
        // Zed has no launcher, so the selection passes over it.
        menu.move_selection(1);
        assert_eq!(menu.chosen(), Some(OpenTarget::SshShell));
        menu.move_selection(-2);
        assert_eq!(menu.chosen(), Some(OpenTarget::Shell));
        menu.move_selection(-1);
        assert_eq!(menu.chosen(), Some(OpenTarget::CopyAlias));
        assert_eq!(menu.by_key('z'), None);
        assert_eq!(menu.by_key('c'), Some(OpenTarget::Editor(Editor::VsCode)));
    }

    #[test]
    fn connect_lines_agree_with_the_menu() {
        assert_eq!(
            connect_lines(&agent(""), &local(&Editor::ALL), SshSetup::Missing),
            [
                "  shell      in this terminal",
                "  ssh        SSH access is not declared in spec.access"
            ]
        );
        assert_eq!(
            connect_lines(&with_ssh(), &local(&[Editor::Zed]), SshSetup::Missing),
            [
                "  shell      in this terminal",
                "  editors    VS Code · Zed",
                "  ! editors need SSH set up; o offers it",
                "  ssh alias  agentctl-worker",
            ]
        );
        let remote = Environment {
            remote: true,
            launchers: Vec::new(),
        };
        assert_eq!(
            connect_lines(&with_ssh(), &remote, SshSetup::Installed)[1],
            "  editors    none: this terminal is reached over SSH"
        );
    }
}
