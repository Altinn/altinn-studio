use std::collections::HashSet;

use agent::{
    Agent, ConditionStatus, Harness,
    sessions::{Session, SessionName, State},
};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

use crate::format;

pub(crate) struct App {
    pub(crate) agents: Vec<Agent>,
    pub(crate) sessions: Vec<Session>,
    pub(crate) groups: Vec<Group>,
    pub(crate) rows: Vec<Row>,
    pub(crate) collapsed: HashSet<String>,
    pub(crate) selected: usize,
    pub(crate) loading: bool,
    pub(crate) loaded: bool,
    pub(crate) error: Option<String>,
    pub(crate) detail: Option<Detail>,
    pub(crate) modal: Option<Modal>,
}

pub(crate) struct Group {
    pub(crate) agent: usize,
    pub(crate) sessions: Vec<usize>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum Row {
    Agent(usize),
    Session { group: usize, position: usize },
}

pub(crate) struct Detail {
    pub(crate) title: String,
    pub(crate) lines: Vec<String>,
    pub(crate) scroll: usize,
}

pub(crate) enum Modal {
    ConfirmDelete {
        agent: String,
        sessions: usize,
    },
    NewSession {
        agent: String,
        name: String,
        harnesses: Vec<Harness>,
        harness: usize,
        error: Option<String>,
    },
}

#[derive(Debug, Eq, PartialEq)]
pub(crate) enum Action {
    None,
    Quit,
    Refresh,
    Attach {
        agent: String,
        session: SessionName,
    },
    CreateSession {
        agent: String,
        session: SessionName,
        harness: Harness,
    },
    Exec {
        agent: String,
    },
    Delete {
        agent: String,
    },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum Tone {
    Green,
    Yellow,
    Gray,
    Red,
}

pub(crate) struct RowView {
    pub(crate) marker: &'static str,
    pub(crate) dot: Option<&'static str>,
    pub(crate) label: String,
    pub(crate) badge: String,
    pub(crate) tone: Tone,
    pub(crate) agent: bool,
}

impl App {
    pub(crate) fn new() -> Self {
        Self {
            agents: Vec::new(),
            sessions: Vec::new(),
            groups: Vec::new(),
            rows: Vec::new(),
            collapsed: HashSet::new(),
            selected: 0,
            loading: false,
            loaded: false,
            error: None,
            detail: None,
            modal: None,
        }
    }

    pub(crate) fn apply_snapshot(&mut self, mut agents: Vec<Agent>, mut sessions: Vec<Session>) {
        agents.sort_by(|left, right| left.metadata.name.cmp(&right.metadata.name));
        sessions.sort_by(|left, right| left.agent.cmp(&right.agent).then_with(|| left.name.cmp(&right.name)));
        self.agents = agents;
        self.sessions = sessions;
        self.loaded = true;
        self.rebuild();
    }

    pub(crate) fn rebuild(&mut self) {
        self.groups = self
            .agents
            .iter()
            .enumerate()
            .map(|(index, agent)| Group {
                agent: index,
                sessions: self
                    .sessions
                    .iter()
                    .enumerate()
                    .filter(|(_, session)| session.agent == agent.metadata.name)
                    .map(|(session_index, _)| session_index)
                    .collect(),
            })
            .collect();
        self.rows = self
            .groups
            .iter()
            .enumerate()
            .flat_map(|(group_index, group)| {
                let mut rows = vec![Row::Agent(group_index)];
                if let Some(agent) = self.agents.get(group.agent)
                    && !self.collapsed.contains(&agent.metadata.name)
                {
                    rows.extend((0..group.sessions.len()).map(|position| Row::Session {
                        group: group_index,
                        position,
                    }));
                }
                rows
            })
            .collect();
        self.selected = self.selected.min(self.rows.len().saturating_sub(1));
    }

    pub(crate) fn selected_row(&self) -> Option<Row> {
        self.rows.get(self.selected).copied()
    }

    pub(crate) fn counts(&self) -> (usize, usize, usize) {
        let running = self
            .sessions
            .iter()
            .filter(|session| session.status.state == State::Running)
            .count();
        (self.agents.len(), self.sessions.len(), running)
    }

    pub(crate) const fn idle(&self) -> bool {
        !self.loading && self.modal.is_none() && self.detail.is_none()
    }

    pub(crate) fn on_key(&mut self, key: KeyEvent) -> Action {
        if self.modal.is_some() {
            return self.modal_key(key);
        }
        if self.detail.is_some() {
            self.detail_key(key);
            return Action::None;
        }
        self.main_key(key)
    }

    fn main_key(&mut self, key: KeyEvent) -> Action {
        match key.code {
            KeyCode::Esc | KeyCode::Char('q') => return Action::Quit,
            KeyCode::Down | KeyCode::Char('j') => self.move_selection(1),
            KeyCode::Up | KeyCode::Char('k') => self.move_selection(-1),
            KeyCode::Char('r') => return Action::Refresh,
            KeyCode::Char('z') => self.toggle_all(),
            _ => {
                return match self.selected_row() {
                    Some(Row::Agent(group)) => self.agent_key(key, group),
                    Some(Row::Session { group, position }) => self.session_key(key, group, position),
                    None => Action::None,
                };
            }
        }
        Action::None
    }

    fn agent_key(&mut self, key: KeyEvent, group: usize) -> Action {
        let Some(agent) = self.group_agent(group) else {
            return Action::None;
        };
        let name = agent.metadata.name.clone();
        match key.code {
            KeyCode::Enter | KeyCode::Char(' ') => self.toggle_fold(&name),
            KeyCode::Right => {
                if self.collapsed.remove(&name) {
                    self.rebuild();
                }
            }
            KeyCode::Left => {
                if self.collapsed.insert(name) {
                    self.rebuild();
                }
            }
            KeyCode::Char('s') => {
                self.detail = Some(Detail {
                    title: format!("agent/{name}"),
                    lines: format::describe_agent_lines(agent),
                    scroll: 0,
                });
            }
            KeyCode::Char('y') => {
                self.detail = Some(Detail {
                    title: format!("agent/{name} yaml"),
                    lines: yaml_lines(agent),
                    scroll: 0,
                });
            }
            KeyCode::Char('d') => {
                let sessions = self.groups.get(group).map_or(0, |group| group.sessions.len());
                self.modal = Some(Modal::ConfirmDelete { agent: name, sessions });
            }
            KeyCode::Char('n') => self.open_new_session(group),
            KeyCode::Char('e') => return Action::Exec { agent: name },
            _ => {}
        }
        Action::None
    }

    fn session_key(&mut self, key: KeyEvent, group: usize, position: usize) -> Action {
        let Some(session) = self.group_session(group, position) else {
            return Action::None;
        };
        match key.code {
            KeyCode::Enter => {
                return Action::Attach {
                    agent: session.agent.clone(),
                    session: session.name.clone(),
                };
            }
            KeyCode::Left => {
                let agent = session.agent.clone();
                self.collapsed.insert(agent);
                self.rebuild();
                if let Some(index) = self.rows.iter().position(|row| *row == Row::Agent(group)) {
                    self.selected = index;
                }
            }
            KeyCode::Char('s') => self.detail = Some(session_detail(session)),
            KeyCode::Char('y') => {
                self.detail = Some(Detail {
                    title: format!("session/{}/{} yaml", session.agent, session.name.as_str()),
                    lines: yaml_lines(session),
                    scroll: 0,
                });
            }
            KeyCode::Char('n') => self.open_new_session(group),
            _ => {}
        }
        Action::None
    }

    fn detail_key(&mut self, key: KeyEvent) {
        let Some(detail) = self.detail.as_mut() else {
            return;
        };
        let limit = detail.lines.len().saturating_sub(1);
        match key.code {
            KeyCode::Esc | KeyCode::Char('q') => self.detail = None,
            KeyCode::Down | KeyCode::Char('j') => detail.scroll = (detail.scroll + 1).min(limit),
            KeyCode::Up | KeyCode::Char('k') => detail.scroll = detail.scroll.saturating_sub(1),
            KeyCode::PageDown => detail.scroll = (detail.scroll + 10).min(limit),
            KeyCode::PageUp => detail.scroll = detail.scroll.saturating_sub(10),
            _ => {}
        }
    }

    fn modal_key(&mut self, key: KeyEvent) -> Action {
        match self.modal.take() {
            Some(Modal::ConfirmDelete { agent, sessions }) => match key.code {
                KeyCode::Char('y') => Action::Delete { agent },
                KeyCode::Esc | KeyCode::Char('n' | 'q') => Action::None,
                _ => {
                    self.modal = Some(Modal::ConfirmDelete { agent, sessions });
                    Action::None
                }
            },
            Some(Modal::NewSession {
                agent,
                mut name,
                harnesses,
                mut harness,
                mut error,
            }) => {
                match key.code {
                    KeyCode::Esc => return Action::None,
                    KeyCode::Enter => match SessionName::new(name.clone()) {
                        Ok(session) => {
                            let Some(kind) = harnesses.get(harness).copied() else {
                                return Action::None;
                            };
                            return Action::CreateSession {
                                agent,
                                session,
                                harness: kind,
                            };
                        }
                        Err(invalid) => error = Some(invalid.to_string()),
                    },
                    KeyCode::Tab | KeyCode::Right => harness = (harness + 1) % harnesses.len().max(1),
                    KeyCode::Left => {
                        harness = harness
                            .checked_sub(1)
                            .unwrap_or_else(|| harnesses.len().saturating_sub(1));
                    }
                    KeyCode::Backspace => {
                        name.pop();
                        error = None;
                    }
                    KeyCode::Char(character)
                        if key.modifiers.difference(KeyModifiers::SHIFT).is_empty()
                            && (character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
                            && name.len() < 64 =>
                    {
                        name.push(character);
                        error = None;
                    }
                    _ => {}
                }
                self.modal = Some(Modal::NewSession {
                    agent,
                    name,
                    harnesses,
                    harness,
                    error,
                });
                Action::None
            }
            None => Action::None,
        }
    }

    fn open_new_session(&mut self, group: usize) {
        let Some(agent) = self.group_agent(group) else {
            return;
        };
        let harnesses = agent.spec.harnesses.iter().map(|spec| spec.kind).collect::<Vec<_>>();
        let harness = agent
            .spec
            .harnesses
            .iter()
            .position(|spec| spec.default)
            .unwrap_or_default();
        self.modal = Some(Modal::NewSession {
            agent: agent.metadata.name.clone(),
            name: String::new(),
            harnesses,
            harness,
            error: None,
        });
    }

    fn toggle_fold(&mut self, name: &str) {
        if !self.collapsed.remove(name) {
            self.collapsed.insert(name.to_owned());
        }
        self.rebuild();
    }

    fn toggle_all(&mut self) {
        if self.collapsed.len() == self.agents.len() {
            self.collapsed.clear();
        } else {
            self.collapsed = self.agents.iter().map(|agent| agent.metadata.name.clone()).collect();
        }
        self.rebuild();
    }

    fn move_selection(&mut self, delta: isize) {
        if self.rows.is_empty() {
            return;
        }
        let length = self.rows.len();
        let current = isize::try_from(self.selected).unwrap_or_default();
        let next = (current + delta).rem_euclid(isize::try_from(length).unwrap_or(1));
        self.selected = usize::try_from(next).unwrap_or_default();
    }

    fn group_agent(&self, group: usize) -> Option<&Agent> {
        self.agents.get(self.groups.get(group)?.agent)
    }

    fn group_session(&self, group: usize, position: usize) -> Option<&Session> {
        self.sessions.get(*self.groups.get(group)?.sessions.get(position)?)
    }

    pub(crate) fn render_rows(&self) -> Vec<RowView> {
        self.rows
            .iter()
            .filter_map(|row| match *row {
                Row::Agent(group) => {
                    let agent = self.group_agent(group)?;
                    let sessions = &self.groups.get(group)?.sessions;
                    let running = sessions
                        .iter()
                        .filter_map(|index| self.sessions.get(*index))
                        .filter(|session| session.status.state == State::Running)
                        .count();
                    let marker = if self.collapsed.contains(&agent.metadata.name) {
                        "▸ "
                    } else {
                        "▾ "
                    };
                    let (tone, status) = agent_tone(agent);
                    Some(RowView {
                        marker,
                        dot: None,
                        label: agent.metadata.name.clone(),
                        badge: format!("{running}/{} · {status}", sessions.len()),
                        tone,
                        agent: true,
                    })
                }
                Row::Session { group, position } => {
                    let session = self.group_session(group, position)?;
                    let last = position + 1 == self.groups.get(group)?.sessions.len();
                    let marker = if last { "  └─ " } else { "  ├─ " };
                    let tone = session_tone(session.status.state);
                    let dot = if session.status.state == State::Idle {
                        "○"
                    } else {
                        "●"
                    };
                    Some(RowView {
                        marker,
                        dot: Some(dot),
                        label: session.name.as_str().to_owned(),
                        badge: format!(
                            "{} · {} · {}",
                            format::session_state(session.status.state),
                            session.harness.as_str(),
                            format::format_age(session.created_at)
                        ),
                        tone,
                        agent: false,
                    })
                }
            })
            .collect()
    }

    pub(crate) fn hints(&self) -> Vec<(&'static str, &'static str)> {
        if let Some(modal) = &self.modal {
            return match modal {
                Modal::ConfirmDelete { .. } => vec![("y", "confirm"), ("n", "cancel")],
                Modal::NewSession { .. } => vec![("enter", "create"), ("tab", "harness"), ("esc", "cancel")],
            };
        }
        if self.detail.is_some() {
            return vec![("j/k", "scroll"), ("q", "back")];
        }
        match self.selected_row() {
            Some(Row::Agent(_)) => vec![
                ("enter", "fold"),
                ("s", "describe"),
                ("y", "yaml"),
                ("n", "new session"),
                ("e", "exec"),
                ("d", "delete"),
                ("z", "all"),
            ],
            Some(Row::Session { .. }) => vec![
                ("enter", "attach"),
                ("s", "describe"),
                ("y", "yaml"),
                ("n", "new session"),
            ],
            None => Vec::new(),
        }
    }
}

fn agent_tone(agent: &Agent) -> (Tone, String) {
    if agent.metadata.deletion_timestamp.is_some() {
        return (Tone::Red, "Terminating".to_owned());
    }
    let ready = agent
        .status
        .conditions
        .iter()
        .find(|condition| condition.kind == "Ready");
    ready.map_or_else(
        || (Tone::Gray, "Pending".to_owned()),
        |condition| {
            let tone = if condition.status == ConditionStatus::True {
                Tone::Green
            } else {
                Tone::Yellow
            };
            let reason = if condition.reason.is_empty() {
                format::condition_status(condition.status).to_owned()
            } else {
                condition.reason.clone()
            };
            (tone, reason)
        },
    )
}

const fn session_tone(state: State) -> Tone {
    match state {
        State::Running => Tone::Green,
        State::Starting => Tone::Yellow,
        State::Idle => Tone::Gray,
        State::Failed => Tone::Red,
    }
}

fn yaml_lines<T: serde::Serialize>(value: &T) -> Vec<String> {
    serde_yaml_ng::to_string(value).map_or_else(
        |error| vec![format!("failed to render YAML: {error}")],
        |yaml| yaml.lines().map(str::to_owned).collect(),
    )
}

fn session_detail(session: &Session) -> Detail {
    let lines = vec![
        format!("Name:       {}", session.name.as_str()),
        format!("Agent:      {}", session.agent),
        format!("Harness:    {}", session.harness.as_str()),
        format!("State:      {}", format::session_state(session.status.state)),
        format!("Age:        {}", format::format_age(session.created_at)),
        format!("Failure:    {}", session.status.failure.as_deref().unwrap_or("-")),
        format!(
            "Harness ID: {}",
            session.status.harness_session_id.as_deref().unwrap_or("-")
        ),
        format!("ID:         {}", session.id),
    ];
    Detail {
        title: format!("session/{}/{}", session.agent, session.name.as_str()),
        lines,
        scroll: 0,
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    fn agent_named(name: &str, harnesses: &str) -> Agent {
        let yaml = format!(
            "apiVersion: agents.platform/v1alpha1\n\
             kind: Agent\n\
             metadata:\n\
             \x20 name: {name}\n\
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
             {harnesses}\
             \x20 secrets: []\n\
             \x20 network:\n\
             \x20   mode: mediated\n\
             \x20   allow: all\n"
        );
        agent::manifest::decode(yaml.as_bytes()).expect("test manifest should decode")
    }

    fn agent(name: &str) -> Agent {
        agent_named(
            name,
            "\x20   - type: claudeCode\n\x20     version: \"1.0.0\"\n\x20     auth: mediated\n",
        )
    }

    fn ready_agent(name: &str) -> Agent {
        let mut agent = agent(name);
        agent.status.conditions.push(agent::Condition {
            kind: "Ready".into(),
            status: ConditionStatus::True,
            reason: "SandboxReady".into(),
            message: String::new(),
        });
        agent
    }

    fn session(agent: &str, name: &str, state: &str) -> Session {
        serde_json::from_value(serde_json::json!({
            "id": "00000000-0000-0000-0000-000000000001",
            "agentId": "00000000-0000-0000-0000-000000000002",
            "agent": agent,
            "name": name,
            "harness": "claudeCode",
            "createdAt": "2026-08-25T00:00:00Z",
            "status": {"state": state}
        }))
        .expect("test session should deserialize")
    }

    fn populated() -> App {
        let mut app = App::new();
        app.apply_snapshot(
            vec![agent("worker"), agent("builder")],
            vec![
                session("worker", "s2", "running"),
                session("worker", "s1", "idle"),
                session("builder", "b1", "starting"),
            ],
        );
        app
    }

    #[test]
    fn snapshot_groups_sessions_under_sorted_agents() {
        let app = populated();
        assert_eq!(
            app.rows,
            vec![
                Row::Agent(0),
                Row::Session { group: 0, position: 0 },
                Row::Agent(1),
                Row::Session { group: 1, position: 0 },
                Row::Session { group: 1, position: 1 },
            ]
        );
        let views = app.render_rows();
        assert_eq!(views[0].label, "builder");
        assert_eq!(views[1].label, "b1");
        assert_eq!(views[2].label, "worker");
        assert_eq!(views[3].label, "s1");
        assert_eq!(views[4].label, "s2");
        assert_eq!(app.counts(), (2, 3, 1));
    }

    #[test]
    fn folding_hides_sessions_and_expand_all_restores_them() {
        let mut app = populated();
        assert_eq!(app.on_key(key(KeyCode::Enter)), Action::None);
        assert_eq!(app.rows.len(), 4);
        app.on_key(key(KeyCode::Char('z')));
        assert_eq!(app.rows.len(), 2);
        app.on_key(key(KeyCode::Char('z')));
        assert_eq!(app.rows.len(), 5);
    }

    #[test]
    fn selection_wraps_and_clamps_after_shrink() {
        let mut app = populated();
        app.on_key(key(KeyCode::Up));
        assert_eq!(app.selected, 4);
        app.on_key(key(KeyCode::Down));
        assert_eq!(app.selected, 0);
        app.selected = 4;
        app.apply_snapshot(vec![agent("worker")], Vec::new());
        assert_eq!(app.selected, 0);
    }

    #[test]
    fn enter_on_a_session_attaches_to_it() {
        let mut app = populated();
        app.selected = 1;
        let action = app.on_key(key(KeyCode::Enter));
        assert_eq!(
            action,
            Action::Attach {
                agent: "builder".into(),
                session: SessionName::new("b1").expect("valid name"),
            }
        );
    }

    #[test]
    fn deleting_an_agent_requires_confirmation() {
        let mut app = populated();
        assert_eq!(app.on_key(key(KeyCode::Char('d'))), Action::None);
        assert!(matches!(app.modal, Some(Modal::ConfirmDelete { .. })));
        assert_eq!(app.on_key(key(KeyCode::Char('n'))), Action::None);
        assert!(app.modal.is_none());
        app.on_key(key(KeyCode::Char('d')));
        assert_eq!(
            app.on_key(key(KeyCode::Char('y'))),
            Action::Delete {
                agent: "builder".into()
            }
        );
        assert!(app.modal.is_none());
    }

    #[test]
    fn new_session_modal_validates_the_name_and_creates_on_enter() {
        let mut app = populated();
        app.on_key(key(KeyCode::Char('n')));
        assert!(matches!(app.modal, Some(Modal::NewSession { .. })));
        assert_eq!(app.on_key(key(KeyCode::Enter)), Action::None);
        assert!(matches!(app.modal, Some(Modal::NewSession { error: Some(_), .. })));
        app.on_key(key(KeyCode::Char('s')));
        app.on_key(key(KeyCode::Char('!')));
        app.on_key(key(KeyCode::Char('1')));
        let action = app.on_key(key(KeyCode::Enter));
        assert_eq!(
            action,
            Action::CreateSession {
                agent: "builder".into(),
                session: SessionName::new("s1").expect("valid name"),
                harness: Harness::ClaudeCode,
            }
        );
        assert!(app.modal.is_none());
    }

    #[test]
    fn new_session_preselects_the_default_harness_and_cycles() {
        let mut app = App::new();
        app.apply_snapshot(
            vec![agent_named(
                "worker",
                "\x20   - type: claudeCode\n\x20     version: \"1.0.0\"\n\x20     auth: mediated\n\
                 \x20   - type: codex\n\x20     version: \"1.0.0\"\n\x20     auth: mediated\n\
                 \x20     default: true\n",
            )],
            Vec::new(),
        );
        app.on_key(key(KeyCode::Char('n')));
        let Some(Modal::NewSession { harness, .. }) = &app.modal else {
            panic!("expected the NewSession modal");
        };
        assert_eq!(*harness, 1);
        app.on_key(key(KeyCode::Tab));
        let Some(Modal::NewSession { harness, .. }) = &app.modal else {
            panic!("expected the NewSession modal");
        };
        assert_eq!(*harness, 0);
        app.on_key(key(KeyCode::Char('s')));
        app.on_key(key(KeyCode::Char('1')));
        assert_eq!(
            app.on_key(key(KeyCode::Enter)),
            Action::CreateSession {
                agent: "worker".into(),
                session: SessionName::new("s1").expect("valid name"),
                harness: Harness::ClaudeCode,
            }
        );
    }

    #[test]
    fn tones_reflect_agent_conditions_and_session_states() {
        let mut terminating = ready_agent("done");
        terminating.metadata.deletion_timestamp = Some(time::OffsetDateTime::now_utc());
        let mut app = App::new();
        app.apply_snapshot(
            vec![ready_agent("alive"), terminating, agent("fresh")],
            vec![session("alive", "up", "running"), session("alive", "down", "failed")],
        );
        let views = app.render_rows();
        assert_eq!(views[0].tone, Tone::Green);
        assert!(views[0].badge.contains("SandboxReady"));
        assert_eq!(views[1].tone, Tone::Red);
        assert_eq!(views[2].tone, Tone::Green);
        assert!(views[3].badge.contains("Terminating"));
        assert_eq!(views[3].tone, Tone::Red);
        assert_eq!(views[4].tone, Tone::Gray);
        assert!(views[4].badge.contains("Pending"));
        assert_eq!(views[1].dot, Some("●"));
        assert!(views[1].badge.contains("Failed"));
    }

    #[test]
    fn describe_opens_a_detail_view_that_scrolls_and_closes() {
        let mut app = populated();
        app.on_key(key(KeyCode::Char('s')));
        let detail = app.detail.as_ref().expect("agent detail");
        assert_eq!(detail.title, "agent/builder");
        app.on_key(key(KeyCode::Char('j')));
        assert_eq!(app.detail.as_ref().expect("agent detail").scroll, 1);
        app.on_key(key(KeyCode::Char('q')));
        assert!(app.detail.is_none());
        app.selected = 1;
        app.on_key(key(KeyCode::Char('s')));
        assert_eq!(app.detail.as_ref().expect("session detail").title, "session/builder/b1");
    }

    #[test]
    fn yaml_views_render_the_full_resource() {
        let mut app = populated();
        app.on_key(key(KeyCode::Char('y')));
        let detail = app.detail.as_ref().expect("agent yaml");
        assert_eq!(detail.title, "agent/builder yaml");
        assert!(detail.lines.iter().any(|line| line == "kind: Agent"));
        assert!(detail.lines.iter().any(|line| line.contains("apiVersion:")));
        assert!(detail.lines.iter().any(|line| line.contains("harnesses:")));
        app.on_key(key(KeyCode::Char('q')));
        app.selected = 1;
        app.on_key(key(KeyCode::Char('y')));
        let detail = app.detail.as_ref().expect("session yaml");
        assert_eq!(detail.title, "session/builder/b1 yaml");
        assert!(detail.lines.iter().any(|line| line.contains("harness: claudeCode")));
        assert!(detail.lines.iter().any(|line| line.contains("name: b1")));
    }
}
