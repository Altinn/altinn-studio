use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    time::Instant,
};

use agent::{
    Agent, ConditionStatus, Effort, Harness, HarnessSpec, Model, ModelSelection,
    sessions::{LifecycleState, Session, SessionName, State},
};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

use crate::{format, forward::ForwardSpec};

/// A displayed key hint and, when unambiguous, the key emitted by a click.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct Hint {
    pub(crate) label: &'static str,
    pub(crate) description: &'static str,
    pub(crate) key: Option<(KeyCode, KeyModifiers)>,
}

impl Hint {
    pub(crate) const fn key(label: &'static str, description: &'static str, code: KeyCode) -> Self {
        Self {
            label,
            description,
            key: Some((code, KeyModifiers::NONE)),
        }
    }

    pub(crate) const fn modified(
        label: &'static str,
        description: &'static str,
        code: KeyCode,
        modifiers: KeyModifiers,
    ) -> Self {
        Self {
            label,
            description,
            key: Some((code, modifiers)),
        }
    }

    pub(crate) const fn display(label: &'static str, description: &'static str) -> Self {
        Self {
            label,
            description,
            key: None,
        }
    }
}

/// Key hints of the new Session form, shared by the modal and the footer.
pub(crate) const NEW_SESSION_HINTS: [Hint; 4] = [
    Hint::key("enter", "create", KeyCode::Enter),
    Hint::display("tab/↑/↓", "field"),
    Hint::display("←/→", "harness"),
    Hint::key("esc", "cancel", KeyCode::Esc),
];

/// Key hints of the create Agent form, shared by the modal and the footer.
pub(crate) const CREATE_AGENT_HINTS: [Hint; 4] = [
    Hint::key("enter", "create", KeyCode::Enter),
    Hint::display("tab/↑/↓", "field"),
    Hint::display("←/→", "select"),
    Hint::key("esc", "cancel", KeyCode::Esc),
];

pub(crate) const CONFIRM_DELETE_HINTS: [Hint; 2] = [
    Hint::key("y", "confirm", KeyCode::Char('y')),
    Hint::key("n", "cancel", KeyCode::Char('n')),
];

pub(crate) const PORT_FORWARD_HINTS: [Hint; 3] = [
    Hint::key("enter", "forward", KeyCode::Enter),
    Hint::key("tab", "field", KeyCode::Tab),
    Hint::key("esc", "cancel", KeyCode::Esc),
];

const DETAIL_HINTS: [Hint; 2] = [
    Hint::display("j/k", "scroll"),
    Hint::key("q", "back", KeyCode::Char('q')),
];

const FORWARD_VIEW_HINTS: [Hint; 3] = [
    Hint::key("e", "edit", KeyCode::Char('e')),
    Hint::modified("ctrl-d", "delete", KeyCode::Char('d'), KeyModifiers::CONTROL),
    Hint::key("q", "back", KeyCode::Char('q')),
];

const AGENT_HINTS: [Hint; 9] = [
    Hint::key("enter", "fold", KeyCode::Enter),
    Hint::key("s", "describe", KeyCode::Char('s')),
    Hint::key("y", "yaml", KeyCode::Char('y')),
    Hint::key("n", "new session", KeyCode::Char('n')),
    Hint::key("c", "new agent", KeyCode::Char('c')),
    Hint::key("e", "exec", KeyCode::Char('e')),
    Hint::key("f", "forward", KeyCode::Char('f')),
    Hint::key("d", "delete", KeyCode::Char('d')),
    Hint::key("z", "all", KeyCode::Char('z')),
];

const SESSION_HINTS: [Hint; 5] = [
    Hint::key("enter", "attach", KeyCode::Enter),
    Hint::key("s", "describe", KeyCode::Char('s')),
    Hint::key("y", "yaml", KeyCode::Char('y')),
    Hint::key("n", "new session", KeyCode::Char('n')),
    Hint::key("c", "new agent", KeyCode::Char('c')),
];

const EMPTY_HINTS: [Hint; 1] = [Hint::key("c", "new agent", KeyCode::Char('c'))];

pub(crate) struct App {
    pub(crate) agents: Vec<Agent>,
    pub(crate) sessions: Vec<Session>,
    pub(crate) groups: Vec<Group>,
    pub(crate) rows: Vec<Row>,
    pub(crate) collapsed: HashSet<String>,
    pub(crate) selection: Option<TreeRowId>,
    pub(crate) loading: bool,
    pub(crate) loaded: bool,
    pub(crate) error: Option<String>,
    pub(crate) poll_error: Option<String>,
    pub(crate) last_updated: Option<Instant>,
    pub(crate) refresh_queued: bool,
    pub(crate) detail: Option<Detail>,
    pub(crate) modal: Option<Modal>,
    pub(crate) forwards: Vec<ForwardEntry>,
    pub(crate) view: View,
    pub(crate) forward_selected: usize,
    pub(crate) creating: usize,
    pub(crate) discovering: bool,
    pub(crate) queued_candidates: Option<Vec<ManifestCandidate>>,
}

/// Display state of one process-owned port forward.
pub(crate) struct ForwardEntry {
    pub(crate) id: u64,
    pub(crate) agent: String,
    pub(crate) local: String,
    pub(crate) guest_port: u16,
    pub(crate) status: Option<String>,
}

impl ForwardEntry {
    /// Renders the mapping as `LOCAL:GUEST`, keeping a non-loopback address.
    fn mapping(&self) -> String {
        let local = self.local.strip_prefix("127.0.0.1:").unwrap_or(&self.local);
        format!("{local}:{}", self.guest_port)
    }
}

/// Which main screen the TUI is showing.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum View {
    Tree,
    Forwards,
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
    pub(crate) target: TreeRowId,
    pub(crate) kind: DetailKind,
    pub(crate) scroll: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum DetailKind {
    Describe,
    Yaml,
}

pub(crate) struct DetailView {
    pub(crate) title: String,
    pub(crate) lines: Vec<String>,
    pub(crate) scroll: usize,
}

pub(crate) enum Modal {
    ConfirmDelete { agent: String, sessions: usize },
    NewSession(SessionForm),
    CreateAgent(CreateForm),
    PortForward(ForwardForm),
}

/// Text field of the new Session form that typing edits.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum SessionField {
    Name,
    Model,
    Effort,
}

impl SessionField {
    const ORDER: [Self; 3] = [Self::Name, Self::Model, Self::Effort];

    fn next(self) -> Self {
        let index = Self::ORDER.iter().position(|field| *field == self).unwrap_or_default();
        Self::ORDER[(index + 1) % Self::ORDER.len()]
    }

    fn previous(self) -> Self {
        let index = Self::ORDER.iter().position(|field| *field == self).unwrap_or_default();
        Self::ORDER[(index + Self::ORDER.len() - 1) % Self::ORDER.len()]
    }
}

/// New Session form state: a name, optional model and effort, and a harness picker.
///
/// Empty model and effort fields leave the choice to the daemon, which applies
/// the selected installation's manifest defaults and then the harness's own.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct SessionForm {
    pub(crate) agent: String,
    pub(crate) name: String,
    pub(crate) model: String,
    pub(crate) effort: String,
    pub(crate) field: SessionField,
    pub(crate) harnesses: Vec<HarnessSpec>,
    pub(crate) harness: usize,
    pub(crate) error: Option<String>,
}

impl SessionForm {
    /// The installation the harness picker currently selects.
    pub(crate) fn installation(&self) -> Option<&HarnessSpec> {
        self.harnesses.get(self.harness)
    }

    /// Manifest default that applies while the model field is empty.
    pub(crate) fn model_default(&self) -> Option<&str> {
        self.installation()
            .and_then(|installation| installation.defaults.model_str())
    }

    /// Manifest default that applies while the effort field is empty.
    pub(crate) fn effort_default(&self) -> Option<&str> {
        self.installation()
            .and_then(|installation| installation.defaults.effort_str())
    }

    /// Applies one key; `Some` closes the form with the returned action.
    fn key(&mut self, key: KeyEvent) -> Option<Action> {
        match key.code {
            KeyCode::Esc => return Some(Action::None),
            KeyCode::Enter => match self.submit() {
                Ok(action) => return Some(action),
                Err(invalid) => self.error = Some(invalid.to_string()),
            },
            KeyCode::Tab | KeyCode::Down => self.field = self.field.next(),
            KeyCode::BackTab | KeyCode::Up => self.field = self.field.previous(),
            KeyCode::Right => self.harness = (self.harness + 1) % self.harnesses.len().max(1),
            KeyCode::Left => {
                self.harness = self
                    .harness
                    .checked_sub(1)
                    .unwrap_or_else(|| self.harnesses.len().saturating_sub(1));
            }
            KeyCode::Backspace => {
                self.value_mut().pop();
                self.error = None;
            }
            KeyCode::Char(character)
                if key.modifiers.difference(KeyModifiers::SHIFT).is_empty() && self.accepts(character) =>
            {
                self.value_mut().push(character);
                self.error = None;
            }
            _ => {}
        }
        None
    }

    fn submit(&self) -> Result<Action, agent::Error> {
        let session = SessionName::new(self.name.clone())?;
        let Some(installation) = self.installation() else {
            return Ok(Action::None);
        };
        let model = (!self.model.is_empty())
            .then(|| Model::new(self.model.clone()))
            .transpose()?;
        let effort = (!self.effort.is_empty())
            .then(|| Effort::new(self.effort.clone()))
            .transpose()?;
        Ok(Action::CreateSession {
            agent: self.agent.clone(),
            session,
            harness: installation.kind,
            model_selection: ModelSelection { model, effort },
        })
    }

    const fn value_mut(&mut self) -> &mut String {
        match self.field {
            SessionField::Name => &mut self.name,
            SessionField::Model => &mut self.model,
            SessionField::Effort => &mut self.effort,
        }
    }

    /// Whether typing `character` into the focused field is accepted. The name
    /// field admits only valid characters; a model or effort keeps whatever was
    /// typed, so an invalid value is reported on submission instead of being
    /// silently reshaped into a different valid one.
    fn accepts(&self, character: char) -> bool {
        match self.field {
            SessionField::Name => {
                (character.is_ascii_alphanumeric() || matches!(character, '-' | '_')) && self.name.len() < 64
            }
            SessionField::Model => !character.is_control() && self.model.chars().count() < 128,
            SessionField::Effort => !character.is_control() && self.effort.chars().count() < 128,
        }
    }
}

/// One manifest source offered by the create-agent picker.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ManifestCandidate {
    /// Full path of the manifest file.
    pub(crate) path: PathBuf,
    /// Decoded `metadata.name`, or why the manifest cannot be used.
    pub(crate) name: Result<String, String>,
    /// Other path spellings discovered for the same canonical file.
    equivalent_paths: Vec<PathBuf>,
}

impl ManifestCandidate {
    pub(crate) const fn new(path: PathBuf, name: Result<String, String>) -> Self {
        Self {
            path,
            name,
            equivalent_paths: Vec::new(),
        }
    }

    pub(crate) fn add_equivalent_path(&mut self, path: PathBuf) {
        if self.path != path && !self.equivalent_paths.contains(&path) {
            self.equivalent_paths.push(path);
        }
    }

    fn matches_path(&self, path: &Path) -> bool {
        self.path == path || self.equivalent_paths.iter().any(|candidate| candidate == path)
    }
}

/// One Agent's default manifest and variant leaves.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct AgentDefinition {
    /// Directory containing the Agent's `agent.yaml`.
    pub(crate) directory: PathBuf,
    /// Manifest leaves in picker order, with `agent.yaml` first.
    pub(crate) variants: Vec<ManifestCandidate>,
}

impl AgentDefinition {
    /// User-facing Agent label, taken from the expanded default when possible.
    pub(crate) fn label(&self) -> String {
        self.variants
            .iter()
            .find(|candidate| {
                candidate
                    .path
                    .file_name()
                    .is_some_and(|name| name == agent::manifest::MANIFEST_FILE)
            })
            .or_else(|| self.variants.first())
            .and_then(|candidate| candidate.name.as_ref().ok())
            .cloned()
            .or_else(|| {
                self.directory
                    .file_name()
                    .map(|name| name.to_string_lossy().into_owned())
            })
            .unwrap_or_else(|| self.directory.display().to_string())
    }
}

/// Focused field of the create-Agent form.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum CreateField {
    Agent,
    Variant,
    Name,
    EnvironmentFile,
}

impl CreateField {
    const ORDER: [Self; 4] = [Self::Agent, Self::Variant, Self::Name, Self::EnvironmentFile];

    fn next(self) -> Self {
        let index = Self::ORDER.iter().position(|field| *field == self).unwrap_or_default();
        Self::ORDER[(index + 1) % Self::ORDER.len()]
    }

    fn previous(self) -> Self {
        let index = Self::ORDER.iter().position(|field| *field == self).unwrap_or_default();
        Self::ORDER[(index + Self::ORDER.len() - 1) % Self::ORDER.len()]
    }
}

/// Create-agent form state: independent Agent and variant pickers plus apply overrides.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct CreateForm {
    pub(crate) agents: Vec<AgentDefinition>,
    pub(crate) agent: usize,
    pub(crate) variant: usize,
    pub(crate) field: CreateField,
    pub(crate) name: String,
    pub(crate) env_file: String,
    pub(crate) error: Option<String>,
}

impl CreateForm {
    /// Groups discovered leaves by sibling directory and preselects exact provenance.
    pub(crate) fn new(candidates: Vec<ManifestCandidate>, selected_path: Option<&Path>) -> Self {
        let mut agents = Vec::<AgentDefinition>::new();
        for candidate in candidates {
            let directory = candidate.path.parent().unwrap_or_else(|| Path::new("")).to_path_buf();
            if let Some(agent) = agents.iter_mut().find(|agent| agent.directory == directory) {
                agent.variants.push(candidate);
            } else {
                agents.push(AgentDefinition {
                    directory,
                    variants: vec![candidate],
                });
            }
        }
        for agent in &mut agents {
            agent.variants.sort_by_key(|candidate| {
                (
                    candidate
                        .path
                        .file_name()
                        .is_none_or(|name| name != agent::manifest::MANIFEST_FILE),
                    candidate.path.clone(),
                )
            });
        }
        let selected = selected_path.and_then(|selected| {
            agents.iter().enumerate().find_map(|(agent_index, agent)| {
                agent
                    .variants
                    .iter()
                    .position(|candidate| candidate.matches_path(selected))
                    .map(|variant| (agent_index, variant))
            })
        });
        let (agent, variant) = selected.unwrap_or_default();
        Self {
            agents,
            agent,
            variant,
            field: CreateField::Agent,
            name: String::new(),
            env_file: String::new(),
            error: None,
        }
    }

    pub(crate) fn agent(&self) -> Option<&AgentDefinition> {
        self.agents.get(self.agent)
    }

    pub(crate) fn candidate(&self) -> Option<&ManifestCandidate> {
        self.agent()?.variants.get(self.variant)
    }

    pub(crate) fn variant_label(&self) -> Option<String> {
        let path = &self.candidate()?.path;
        if path
            .file_name()
            .is_some_and(|name| name == agent::manifest::MANIFEST_FILE)
        {
            Some("default".into())
        } else {
            agent::manifest::variant_from_filename(path)
                .map(String::from)
                .or_else(|| path.file_name().map(|name| name.to_string_lossy().into_owned()))
        }
    }

    /// Returns the selected manifest's name, shown grayed while nothing is typed.
    pub(crate) fn placeholder(&self) -> Option<&str> {
        self.candidate()?.name.as_deref().ok()
    }

    /// Applies one key press; a submitted or cancelled form returns its Action.
    fn key(&mut self, key: KeyEvent, agents: &[Agent]) -> Option<Action> {
        match key.code {
            KeyCode::Esc => return Some(Action::None),
            KeyCode::Enter => match self.submission(agents) {
                Ok(action) => return Some(action),
                Err(invalid) => self.error = Some(invalid),
            },
            KeyCode::Tab | KeyCode::Down => {
                self.field = self.field.next();
                self.error = None;
            }
            KeyCode::BackTab | KeyCode::Up => {
                self.field = self.field.previous();
                self.error = None;
            }
            KeyCode::Right => self.select(1),
            KeyCode::Left => self.select(-1),
            KeyCode::Backspace if matches!(self.field, CreateField::Name | CreateField::EnvironmentFile) => {
                match self.field {
                    CreateField::Name => {
                        self.name.pop();
                    }
                    CreateField::EnvironmentFile => {
                        self.env_file.pop();
                    }
                    CreateField::Agent | CreateField::Variant => {}
                }
                self.error = None;
            }
            KeyCode::Char(character)
                if self.field == CreateField::Name
                    && key.modifiers.difference(KeyModifiers::SHIFT).is_empty()
                    && ::sandbox::SandboxName::accepts(character)
                    && self.name.len() < ::sandbox::MAX_SANDBOX_NAME_BYTES =>
            {
                self.name.push(character);
                self.error = None;
            }
            KeyCode::Char(character)
                if self.field == CreateField::EnvironmentFile
                    && key.modifiers.difference(KeyModifiers::SHIFT).is_empty()
                    && !character.is_control()
                    && self.env_file.len() < 4096 =>
            {
                self.env_file.push(character);
                self.error = None;
            }
            _ => {}
        }
        None
    }

    fn select(&mut self, delta: isize) {
        match self.field {
            CreateField::Agent => {
                self.agent = wrapped_index(self.agent, self.agents.len(), delta);
                self.variant = 0;
            }
            CreateField::Variant => {
                let length = self.agent().map_or(0, |agent| agent.variants.len());
                self.variant = wrapped_index(self.variant, length, delta);
            }
            CreateField::Name | CreateField::EnvironmentFile => return,
        }
        self.error = None;
    }

    fn submission(&self, agents: &[Agent]) -> Result<Action, String> {
        let candidate = self
            .candidate()
            .ok_or_else(|| "no Agent manifests found; apply one with agentctl apply".to_owned())?;
        let manifest_name = candidate.name.as_ref().map_err(Clone::clone)?;
        let name = if self.name.is_empty() {
            manifest_name.clone()
        } else {
            self.name.clone()
        };
        ::sandbox::SandboxName::new(name.clone()).map_err(|invalid| format!("name: {invalid}"))?;
        if agents.iter().any(|agent| agent.metadata.name == name) {
            return Err(format!("agent {name:?} already exists"));
        }
        Ok(Action::CreateAgent {
            manifest: candidate.path.clone(),
            name,
            env_file: (!self.env_file.is_empty()).then(|| PathBuf::from(&self.env_file)),
            form: self.clone(),
        })
    }
}

fn wrapped_index(current: usize, length: usize, delta: isize) -> usize {
    if length == 0 {
        return 0;
    }
    let length = isize::try_from(length).unwrap_or(1);
    let current = isize::try_from(current).unwrap_or_default();
    usize::try_from((current + delta).rem_euclid(length)).unwrap_or_default()
}

/// k9s-style port-forward form state.
pub(crate) struct ForwardForm {
    pub(crate) agent: String,
    pub(crate) address: String,
    pub(crate) local: String,
    pub(crate) guest: String,
    pub(crate) field: ForwardField,
    pub(crate) error: Option<String>,
    pub(crate) replace: Option<u64>,
}

impl ForwardForm {
    /// Reopens the form for a mapping the runtime rejected, keeping its values.
    pub(crate) fn rejected(agent: String, spec: &ForwardSpec, replace: Option<u64>, error: String) -> Self {
        Self {
            agent,
            address: spec.address.to_string(),
            local: if spec.local_port == 0 {
                String::new()
            } else {
                spec.local_port.to_string()
            },
            guest: spec.guest_port.to_string(),
            field: ForwardField::Address,
            error: Some(bind_hint(spec, error)),
            replace,
        }
    }

    /// Applies one key press; a submitted or cancelled form returns its Action.
    fn key(&mut self, key: KeyEvent) -> Option<Action> {
        match key.code {
            KeyCode::Esc => return Some(Action::None),
            KeyCode::Enter => {
                let local = if self.local.is_empty() {
                    &self.guest
                } else {
                    &self.local
                };
                match ForwardSpec::parse(&format!("{}:{local}:{}", self.address, self.guest)) {
                    Ok(spec) => {
                        return Some(Action::CreateForward {
                            agent: self.agent.clone(),
                            spec,
                            replace: self.replace,
                        });
                    }
                    Err(invalid) => self.error = Some(invalid),
                }
            }
            KeyCode::Tab | KeyCode::Down => self.field = self.field.next(),
            KeyCode::BackTab | KeyCode::Up => self.field = self.field.previous(),
            KeyCode::Backspace => {
                self.field_text().pop();
                self.error = None;
            }
            KeyCode::Char(character)
                if key.modifiers.difference(KeyModifiers::SHIFT).is_empty()
                    && forward_field_accepts(self.field, character) =>
            {
                let text = self.field_text();
                if text.len() < 45 {
                    text.push(character);
                    self.error = None;
                }
            }
            _ => {}
        }
        None
    }

    const fn field_text(&mut self) -> &mut String {
        match self.field {
            ForwardField::Address => &mut self.address,
            ForwardField::LocalPort => &mut self.local,
            ForwardField::GuestPort => &mut self.guest,
        }
    }
}

/// One editable field of the port-forward form.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum ForwardField {
    Address,
    LocalPort,
    GuestPort,
}

/// A semantic interaction emitted by the renderer's hit map.
///
/// Mouse input uses these instead of terminal coordinates so layout remains
/// entirely owned by the renderer. Keyboard-shaped controls deliberately flow
/// back through `on_key` to keep both input methods equivalent.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum MouseAction {
    Key(KeyCode, KeyModifiers),
    Select(RowTarget),
    Primary(RowTarget),
    FoldTree(TreeRowId),
    MoveTree(isize),
    MoveForward(isize),
    ScrollDetail(isize),
    FocusSessionField(SessionField),
    SelectHarness(usize),
    FocusCreateField(CreateField),
    SelectCreate { field: CreateField, delta: isize },
    FocusForwardField(ForwardField),
}

/// A rendered row whose selection is owned by the application.
#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub(crate) enum TreeRowId {
    Agent(String),
    Session { agent: String, session: SessionName },
}

/// A rendered row whose selection is owned by the application.
#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum RowTarget {
    Tree(TreeRowId),
    Forward(u64),
}

impl ForwardField {
    const fn next(self) -> Self {
        match self {
            Self::Address => Self::LocalPort,
            Self::LocalPort => Self::GuestPort,
            Self::GuestPort => Self::Address,
        }
    }

    const fn previous(self) -> Self {
        match self {
            Self::Address => Self::GuestPort,
            Self::LocalPort => Self::Address,
            Self::GuestPort => Self::LocalPort,
        }
    }
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
        model_selection: ModelSelection,
    },
    OpenCreate,
    CreateAgent {
        manifest: PathBuf,
        name: String,
        env_file: Option<PathBuf>,
        form: CreateForm,
    },
    Exec {
        agent: String,
    },
    Delete {
        agent: String,
    },
    CreateForward {
        agent: String,
        spec: ForwardSpec,
        replace: Option<u64>,
    },
    DeleteForward {
        id: u64,
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
            selection: None,
            loading: false,
            loaded: false,
            error: None,
            poll_error: None,
            last_updated: None,
            refresh_queued: false,
            detail: None,
            modal: None,
            forwards: Vec::new(),
            view: View::Tree,
            forward_selected: 0,
            creating: 0,
            discovering: false,
            queued_candidates: None,
        }
    }

    pub(crate) fn apply_snapshot(&mut self, mut agents: Vec<Agent>, mut sessions: Vec<Session>) {
        let selection = self.selection.clone();
        let fallback = self.selected_index().unwrap_or_default();
        agents.sort_by(|left, right| left.metadata.name.cmp(&right.metadata.name));
        sessions.sort_by(|left, right| left.agent.cmp(&right.agent).then_with(|| left.name.cmp(&right.name)));
        self.agents = agents;
        self.sessions = sessions;
        self.loaded = true;
        self.rebuild_with(selection, fallback);
    }

    pub(crate) fn rebuild(&mut self) {
        let selection = self.selection.clone();
        let fallback = self.selected_index().unwrap_or_default();
        self.rebuild_with(selection, fallback);
    }

    fn rebuild_with(&mut self, selection: Option<TreeRowId>, fallback: usize) {
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
        self.selection = selection
            .filter(|target| self.tree_index(target).is_some())
            .or_else(|| {
                let index = fallback.min(self.rows.len().saturating_sub(1));
                self.tree_id_at(index)
            });
    }

    pub(crate) fn selected_row(&self) -> Option<Row> {
        self.rows.get(self.selected_index()?).copied()
    }

    pub(crate) fn selected_index(&self) -> Option<usize> {
        self.selection.as_ref().and_then(|target| self.tree_index(target))
    }

    pub(crate) fn row_target(&self, index: usize) -> Option<RowTarget> {
        self.tree_id_at(index).map(RowTarget::Tree)
    }

    pub(crate) fn select_index(&mut self, index: usize) -> bool {
        let Some(target) = self.tree_id_at(index) else {
            return false;
        };
        self.selection = Some(target);
        true
    }

    pub(crate) fn counts(&self) -> (usize, usize, usize) {
        let running = self
            .sessions
            .iter()
            .filter(|session| session.status.lifecycle.state == LifecycleState::Running)
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
        // The error screen renders over the forwards view, so its keys must
        // win over forwards_key while an error is shown.
        if self.view == View::Forwards && self.error.is_none() {
            return self.forwards_key(key);
        }
        self.main_key(key)
    }

    pub(crate) fn on_mouse(&mut self, action: MouseAction) -> Action {
        match action {
            MouseAction::Key(code, modifiers) => self.on_key(KeyEvent::new(code, modifiers)),
            MouseAction::Select(target) => {
                self.select_row(&target);
                Action::None
            }
            MouseAction::Primary(target) => {
                let code = match target {
                    RowTarget::Tree(_) => KeyCode::Enter,
                    RowTarget::Forward(_) => KeyCode::Char('e'),
                };
                if !self.select_row(&target) {
                    return Action::None;
                }
                self.on_key(KeyEvent::new(code, KeyModifiers::NONE))
            }
            MouseAction::FoldTree(target) => {
                if !matches!(target, TreeRowId::Agent(_)) || !self.select_tree(&target) {
                    return Action::None;
                }
                self.on_key(KeyEvent::new(KeyCode::Enter, KeyModifiers::NONE))
            }
            MouseAction::MoveTree(delta) => {
                self.move_selection_clamped(delta);
                Action::None
            }
            MouseAction::MoveForward(delta) => {
                self.move_forward_selection_clamped(delta);
                Action::None
            }
            MouseAction::ScrollDetail(delta) => {
                let limit = self
                    .detail_view()
                    .map_or(0, |detail| detail.lines.len().saturating_sub(1));
                let Some(detail) = self.detail.as_mut() else {
                    return Action::None;
                };
                detail.scroll = offset_clamped(detail.scroll, limit, delta);
                Action::None
            }
            MouseAction::FocusSessionField(field) => {
                if let Some(Modal::NewSession(form)) = &mut self.modal {
                    form.field = field;
                }
                Action::None
            }
            MouseAction::SelectHarness(index) => {
                if let Some(Modal::NewSession(form)) = &mut self.modal
                    && index < form.harnesses.len()
                {
                    form.harness = index;
                }
                Action::None
            }
            MouseAction::FocusCreateField(field) => {
                if let Some(Modal::CreateAgent(form)) = &mut self.modal {
                    form.field = field;
                    form.error = None;
                }
                Action::None
            }
            MouseAction::SelectCreate { field, delta } => {
                if let Some(Modal::CreateAgent(form)) = &mut self.modal {
                    form.field = field;
                    form.select(delta);
                }
                Action::None
            }
            MouseAction::FocusForwardField(field) => {
                if let Some(Modal::PortForward(form)) = &mut self.modal {
                    form.field = field;
                }
                Action::None
            }
        }
    }

    fn select_row(&mut self, target: &RowTarget) -> bool {
        match target {
            RowTarget::Tree(target) => return self.select_tree(target),
            RowTarget::Forward(id) => {
                let Some(index) = self.forwards.iter().position(|entry| entry.id == *id) else {
                    return false;
                };
                self.forward_selected = index;
            }
        }
        true
    }

    fn select_tree(&mut self, target: &TreeRowId) -> bool {
        if self.tree_index(target).is_none() {
            return false;
        }
        self.selection = Some(target.clone());
        true
    }

    fn main_key(&mut self, key: KeyEvent) -> Action {
        match key.code {
            KeyCode::Esc | KeyCode::Char('q') => return Action::Quit,
            KeyCode::Down | KeyCode::Char('j') => self.move_selection(1),
            KeyCode::Up | KeyCode::Char('k') => self.move_selection(-1),
            KeyCode::Char('r') => return Action::Refresh,
            KeyCode::Char('z') => self.toggle_all(),
            KeyCode::Char('F') => self.view = View::Forwards,
            KeyCode::Char('c') => return Action::OpenCreate,
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

    fn forwards_key(&mut self, key: KeyEvent) -> Action {
        match key.code {
            KeyCode::Esc | KeyCode::Char('q' | 'F') => self.view = View::Tree,
            KeyCode::Down | KeyCode::Char('j') => self.move_forward_selection(1),
            KeyCode::Up | KeyCode::Char('k') => self.move_forward_selection(-1),
            KeyCode::Char('d') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                if let Some(entry) = self.forwards.get(self.forward_selected) {
                    return Action::DeleteForward { id: entry.id };
                }
            }
            KeyCode::Char('e') => {
                if let Some(entry) = self.forwards.get(self.forward_selected) {
                    let (address, local) = entry
                        .local
                        .rsplit_once(':')
                        .map_or((String::new(), String::new()), |(address, local)| {
                            (address.to_owned(), local.to_owned())
                        });
                    self.modal = Some(Modal::PortForward(ForwardForm {
                        agent: entry.agent.clone(),
                        address,
                        local,
                        guest: entry.guest_port.to_string(),
                        field: ForwardField::LocalPort,
                        error: None,
                        replace: Some(entry.id),
                    }));
                }
            }
            _ => {}
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
                    target: TreeRowId::Agent(name),
                    kind: DetailKind::Describe,
                    scroll: 0,
                });
            }
            KeyCode::Char('y') => {
                self.detail = Some(Detail {
                    target: TreeRowId::Agent(name),
                    kind: DetailKind::Yaml,
                    scroll: 0,
                });
            }
            KeyCode::Char('d') => {
                let sessions = self.groups.get(group).map_or(0, |group| group.sessions.len());
                self.modal = Some(Modal::ConfirmDelete { agent: name, sessions });
            }
            KeyCode::Char('n') => self.open_new_session(group),
            KeyCode::Char('e') => return Action::Exec { agent: name },
            KeyCode::Char('f') => {
                self.modal = Some(Modal::PortForward(ForwardForm {
                    agent: name,
                    address: "127.0.0.1".into(),
                    local: String::new(),
                    guest: String::new(),
                    field: ForwardField::GuestPort,
                    error: None,
                    replace: None,
                }));
            }
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
                self.collapsed.insert(agent.clone());
                self.selection = Some(TreeRowId::Agent(agent));
                self.rebuild();
            }
            KeyCode::Char('s') => {
                self.detail = Some(Detail {
                    target: TreeRowId::Session {
                        agent: session.agent.clone(),
                        session: session.name.clone(),
                    },
                    kind: DetailKind::Describe,
                    scroll: 0,
                });
            }
            KeyCode::Char('y') => {
                self.detail = Some(Detail {
                    target: TreeRowId::Session {
                        agent: session.agent.clone(),
                        session: session.name.clone(),
                    },
                    kind: DetailKind::Yaml,
                    scroll: 0,
                });
            }
            KeyCode::Char('n') => self.open_new_session(group),
            _ => {}
        }
        Action::None
    }

    fn detail_key(&mut self, key: KeyEvent) {
        let limit = self
            .detail_view()
            .map_or(0, |detail| detail.lines.len().saturating_sub(1));
        match key.code {
            KeyCode::Esc | KeyCode::Char('q') => self.detail = None,
            KeyCode::Down | KeyCode::Char('j') => {
                if let Some(detail) = self.detail.as_mut() {
                    detail.scroll = (detail.scroll + 1).min(limit);
                }
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if let Some(detail) = self.detail.as_mut() {
                    detail.scroll = detail.scroll.saturating_sub(1);
                }
            }
            KeyCode::PageDown => {
                if let Some(detail) = self.detail.as_mut() {
                    detail.scroll = (detail.scroll + 10).min(limit);
                }
            }
            KeyCode::PageUp => {
                if let Some(detail) = self.detail.as_mut() {
                    detail.scroll = detail.scroll.saturating_sub(10);
                }
            }
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
            Some(Modal::NewSession(mut form)) => {
                if let Some(action) = form.key(key) {
                    return action;
                }
                self.modal = Some(Modal::NewSession(form));
                Action::None
            }
            Some(Modal::CreateAgent(mut form)) => {
                if let Some(action) = form.key(key, &self.agents) {
                    return action;
                }
                self.modal = Some(Modal::CreateAgent(form));
                Action::None
            }
            Some(Modal::PortForward(mut form)) => {
                if let Some(action) = form.key(key) {
                    return action;
                }
                self.modal = Some(Modal::PortForward(form));
                Action::None
            }
            None => Action::None,
        }
    }

    /// Opens the create-agent modal for finished discovery, or queues the
    /// candidates while another view is open.
    pub(crate) fn manifests_discovered(&mut self, candidates: Vec<ManifestCandidate>) {
        if !std::mem::take(&mut self.discovering) {
            return;
        }
        if self.idle() {
            self.open_create(candidates);
        } else {
            self.queued_candidates = Some(candidates);
        }
    }

    /// Opens the create-agent modal for candidates queued behind another view once it closes.
    pub(crate) fn open_queued_create(&mut self) {
        if self.idle()
            && let Some(candidates) = self.queued_candidates.take()
        {
            self.open_create(candidates);
        }
    }

    /// Opens the create-agent modal, preselecting the highlighted Agent's manifest.
    pub(crate) fn open_create(&mut self, candidates: Vec<ManifestCandidate>) {
        let manifest = match self.selected_row() {
            Some(Row::Agent(group) | Row::Session { group, .. }) => self
                .group_agent(group)
                .and_then(|agent| agent.status.provenance.as_ref())
                .map(agent::Provenance::manifest_or_default),
            None => None,
        };
        self.modal = Some(Modal::CreateAgent(CreateForm::new(candidates, manifest.as_deref())));
    }

    pub(crate) fn select_agent(&mut self, name: &str) {
        let target = TreeRowId::Agent(name.to_owned());
        self.select_tree(&target);
    }

    fn open_new_session(&mut self, group: usize) {
        let Some(agent) = self.group_agent(group) else {
            return;
        };
        let harness = agent
            .spec
            .harnesses
            .iter()
            .position(|spec| spec.default)
            .unwrap_or_default();
        self.modal = Some(Modal::NewSession(SessionForm {
            agent: agent.metadata.name.clone(),
            name: String::new(),
            model: String::new(),
            effort: String::new(),
            field: SessionField::Name,
            harnesses: agent.spec.harnesses.clone(),
            harness,
            error: None,
        }));
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

    fn move_forward_selection(&mut self, delta: isize) {
        if self.forwards.is_empty() {
            return;
        }
        let length = isize::try_from(self.forwards.len()).unwrap_or(1);
        let current = isize::try_from(self.forward_selected).unwrap_or_default();
        self.forward_selected = usize::try_from((current + delta).rem_euclid(length)).unwrap_or_default();
    }

    fn move_forward_selection_clamped(&mut self, delta: isize) {
        if !self.forwards.is_empty() {
            self.forward_selected = offset_clamped(self.forward_selected, self.forwards.len() - 1, delta);
        }
    }

    /// Replaces the forward display list, keeping the selection in range.
    pub(crate) fn set_forwards(&mut self, forwards: Vec<ForwardEntry>) {
        let selected = self.forwards.get(self.forward_selected).map(|entry| entry.id);
        let fallback = self.forward_selected;
        self.forwards = forwards;
        self.forward_selected = selected
            .and_then(|id| self.forwards.iter().position(|entry| entry.id == id))
            .unwrap_or_else(|| fallback.min(self.forwards.len().saturating_sub(1)));
    }

    fn move_selection(&mut self, delta: isize) {
        if self.rows.is_empty() {
            return;
        }
        let length = self.rows.len();
        let current = isize::try_from(self.selected_index().unwrap_or_default()).unwrap_or_default();
        let next = (current + delta).rem_euclid(isize::try_from(length).unwrap_or(1));
        self.select_index(usize::try_from(next).unwrap_or_default());
    }

    fn move_selection_clamped(&mut self, delta: isize) {
        if !self.rows.is_empty() {
            let index = offset_clamped(self.selected_index().unwrap_or_default(), self.rows.len() - 1, delta);
            self.select_index(index);
        }
    }

    fn tree_id_at(&self, index: usize) -> Option<TreeRowId> {
        match *self.rows.get(index)? {
            Row::Agent(group) => Some(TreeRowId::Agent(self.group_agent(group)?.metadata.name.clone())),
            Row::Session { group, position } => {
                let session = self.group_session(group, position)?;
                Some(TreeRowId::Session {
                    agent: session.agent.clone(),
                    session: session.name.clone(),
                })
            }
        }
    }

    fn tree_index(&self, target: &TreeRowId) -> Option<usize> {
        self.rows
            .iter()
            .enumerate()
            .find_map(|(index, _)| (self.tree_id_at(index).as_ref() == Some(target)).then_some(index))
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
                        .filter(|session| session.status.lifecycle.state == LifecycleState::Running)
                        .count();
                    let marker = if self.collapsed.contains(&agent.metadata.name) {
                        "▸ "
                    } else {
                        "▾ "
                    };
                    let (tone, status) = agent_tone(agent);
                    let forwards = self
                        .forwards
                        .iter()
                        .filter(|entry| entry.agent == agent.metadata.name)
                        .map(ForwardEntry::mapping)
                        .collect::<Vec<_>>();
                    let forward_badge = if forwards.is_empty() {
                        String::new()
                    } else {
                        format!(" · ports: {}", forwards.join(" "))
                    };
                    let badge = format!("{running}/{} · {status}{forward_badge}", sessions.len());
                    Some(RowView {
                        marker,
                        dot: None,
                        label: agent.metadata.name.clone(),
                        badge,
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
                            "{} · {}{} · {}",
                            format::session_state(session.status.state),
                            session.harness.as_str(),
                            session
                                .model_selection
                                .model_str()
                                .map(|model| format!(" · {model}"))
                                .unwrap_or_default(),
                            format::format_age(session.created_at)
                        ),
                        tone,
                        agent: false,
                    })
                }
            })
            .collect()
    }

    pub(crate) fn hints(&self) -> &'static [Hint] {
        if let Some(modal) = &self.modal {
            return match modal {
                Modal::ConfirmDelete { .. } => &CONFIRM_DELETE_HINTS,
                Modal::NewSession(_) => &NEW_SESSION_HINTS,
                Modal::CreateAgent { .. } => &CREATE_AGENT_HINTS,
                Modal::PortForward { .. } => &PORT_FORWARD_HINTS,
            };
        }
        if self.detail.is_some() {
            return &DETAIL_HINTS;
        }
        if self.view == View::Forwards {
            return &FORWARD_VIEW_HINTS;
        }
        match self.selected_row() {
            Some(Row::Agent(_)) => &AGENT_HINTS,
            Some(Row::Session { .. }) => &SESSION_HINTS,
            None => &EMPTY_HINTS,
        }
    }

    pub(crate) fn detail_view(&self) -> Option<DetailView> {
        let detail = self.detail.as_ref()?;
        let (title, lines) = match &detail.target {
            TreeRowId::Agent(name) => {
                let title = format!(
                    "agent/{name}{}",
                    if detail.kind == DetailKind::Yaml { " yaml" } else { "" }
                );
                let lines = self
                    .agents
                    .iter()
                    .find(|agent| agent.metadata.name == *name)
                    .map_or_else(
                        || vec![format!("Agent {name:?} no longer exists.")],
                        |agent| match detail.kind {
                            DetailKind::Describe => format::describe_agent_lines(agent),
                            DetailKind::Yaml => yaml_lines(agent),
                        },
                    );
                (title, lines)
            }
            TreeRowId::Session { agent, session } => {
                let title = format!(
                    "session/{}/{}{}",
                    agent,
                    session.as_str(),
                    if detail.kind == DetailKind::Yaml { " yaml" } else { "" }
                );
                let lines = self
                    .sessions
                    .iter()
                    .find(|candidate| candidate.agent == *agent && candidate.name == *session)
                    .map_or_else(
                        || vec![format!("Session {agent}/{session} no longer exists.")],
                        |session| match detail.kind {
                            DetailKind::Describe => session_detail_lines(session),
                            DetailKind::Yaml => yaml_lines(session),
                        },
                    );
                (title, lines)
            }
        };
        Some(DetailView {
            title,
            lines,
            scroll: detail.scroll,
        })
    }
}

fn offset_clamped(current: usize, limit: usize, delta: isize) -> usize {
    if delta.is_negative() {
        current.saturating_sub(delta.unsigned_abs())
    } else {
        current.saturating_add(delta.unsigned_abs()).min(limit)
    }
}

fn agent_tone(agent: &Agent) -> (Tone, String) {
    if agent.metadata.deletion_timestamp.is_some() {
        return (Tone::Red, "Terminating".to_owned());
    }
    let ready = agent.status.ready_condition();
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
        State::Working | State::WaitingForInput => Tone::Green,
        State::Starting => Tone::Yellow,
        State::Idle => Tone::Gray,
        State::Failed => Tone::Red,
    }
}

fn bind_hint(spec: &ForwardSpec, error: String) -> String {
    let low_port_on_specific_address = spec.local_port != 0 && spec.local_port < 1024 && !spec.address.is_unspecified();
    if cfg!(target_os = "macos") && low_port_on_specific_address && error.contains("Permission denied") {
        format!("{error} — macOS allows ports below 1024 only on 0.0.0.0")
    } else {
        error
    }
}

const fn forward_field_accepts(field: ForwardField, character: char) -> bool {
    match field {
        ForwardField::Address => character.is_ascii_digit() || character == '.',
        ForwardField::LocalPort | ForwardField::GuestPort => character.is_ascii_digit(),
    }
}

fn yaml_lines<T: serde::Serialize>(value: &T) -> Vec<String> {
    serde_yaml_ng::to_string(value).map_or_else(
        |error| vec![format!("failed to render YAML: {error}")],
        |yaml| yaml.lines().map(str::to_owned).collect(),
    )
}

fn session_detail_lines(session: &Session) -> Vec<String> {
    vec![
        format!("Name:       {}", session.name.as_str()),
        format!("Agent:      {}", session.agent),
        format!("Harness:    {}", session.harness.as_str()),
        format!("Model:      {}", session.model_selection.model_str().unwrap_or("-")),
        format!("Effort:     {}", session.model_selection.effort_str().unwrap_or("-")),
        format!("State:      {}", format::session_state(session.status.state)),
        format!("Turns:      {}", session.status.reported.activity.turns),
        format!("Age:        {}", format::format_age(session.created_at)),
        format!(
            "Failure:    {}",
            session.status.lifecycle.failure.as_deref().unwrap_or("-")
        ),
        format!(
            "Harness ID: {}",
            session.status.reported.harness_session_id.as_deref().unwrap_or("-")
        ),
        format!("ID:         {}", session.id),
    ]
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
        let lifecycle = match state {
            "working" | "waitingForInput" => "running",
            other => other,
        };
        serde_json::from_value(serde_json::json!({
            "id": "00000000-0000-0000-0000-000000000001",
            "agentId": "00000000-0000-0000-0000-000000000002",
            "agent": agent,
            "name": name,
            "harness": "claudeCode",
            "createdAt": "2026-08-25T00:00:00Z",
            "status": {"state": state, "lifecycle": {"state": lifecycle}}
        }))
        .expect("test session should deserialize")
    }

    fn populated() -> App {
        let mut app = App::new();
        app.apply_snapshot(
            vec![agent("worker"), agent("builder")],
            vec![
                session("worker", "s2", "working"),
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
        assert_eq!(app.selected_index(), Some(4));
        app.on_key(key(KeyCode::Down));
        assert_eq!(app.selected_index(), Some(0));
        app.select_index(4);
        app.apply_snapshot(vec![agent("worker")], Vec::new());
        assert_eq!(app.selected_index(), Some(0));
    }

    #[test]
    fn snapshot_rebuild_preserves_selection_by_resource_identity() {
        let mut app = populated();
        app.select_index(4);
        assert_eq!(
            app.selection,
            Some(TreeRowId::Session {
                agent: "worker".into(),
                session: SessionName::new("s2").expect("valid Session name"),
            })
        );

        app.apply_snapshot(
            vec![agent("worker"), agent("builder")],
            vec![
                session("worker", "s2", "working"),
                session("worker", "s0", "idle"),
                session("worker", "s1", "idle"),
                session("builder", "b1", "starting"),
            ],
        );

        assert_eq!(app.selected_index(), Some(5));
        assert_eq!(
            app.selection,
            Some(TreeRowId::Session {
                agent: "worker".into(),
                session: SessionName::new("s2").expect("valid Session name"),
            })
        );
    }

    #[test]
    fn stale_mouse_target_still_acts_on_the_rendered_resource_after_reorder() {
        let mut app = populated();
        let target = app.row_target(4).expect("rendered s2 target");
        app.apply_snapshot(
            vec![agent("worker"), agent("builder")],
            vec![
                session("worker", "s2", "working"),
                session("worker", "s0", "idle"),
                session("worker", "s1", "idle"),
                session("builder", "b1", "starting"),
            ],
        );

        assert_eq!(
            app.on_mouse(MouseAction::Primary(target)),
            Action::Attach {
                agent: "worker".into(),
                session: SessionName::new("s2").expect("valid Session name"),
            }
        );
    }

    #[test]
    fn enter_on_a_session_attaches_to_it() {
        let mut app = populated();
        app.select_index(1);
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
    fn mouse_row_selection_is_separate_from_primary_actions() {
        let mut app = populated();
        let session = app.row_target(4).expect("session target");

        assert_eq!(app.on_mouse(MouseAction::Select(session.clone())), Action::None);
        assert_eq!(app.selected_index(), Some(4));
        assert_eq!(
            app.on_mouse(MouseAction::Primary(session)),
            Action::Attach {
                agent: "worker".into(),
                session: SessionName::new("s2").expect("valid Session name"),
            }
        );

        assert_eq!(app.rows.len(), 5);
        assert_eq!(
            app.on_mouse(MouseAction::FoldTree(TreeRowId::Agent("builder".into()))),
            Action::None
        );
        assert_eq!(app.rows.len(), 4);
    }

    #[test]
    fn mouse_wheel_selection_and_detail_scrolling_clamp_at_the_ends() {
        let mut app = populated();
        app.select_index(app.rows.len() - 1);

        app.on_mouse(MouseAction::MoveTree(1));
        assert_eq!(app.selected_index(), Some(app.rows.len() - 1));
        app.on_mouse(MouseAction::MoveTree(-100));
        assert_eq!(app.selected_index(), Some(0));

        app.detail = Some(Detail {
            target: TreeRowId::Agent("builder".into()),
            kind: DetailKind::Describe,
            scroll: 0,
        });
        let limit = app.detail_view().expect("detail view").lines.len() - 1;
        app.on_mouse(MouseAction::ScrollDetail(100));
        assert_eq!(app.detail.as_ref().map(|detail| detail.scroll), Some(limit));
        app.on_mouse(MouseAction::ScrollDetail(-100));
        assert_eq!(app.detail.as_ref().map(|detail| detail.scroll), Some(0));
    }

    #[test]
    fn clickable_actions_keep_confirmation_and_terminal_action_semantics() {
        let mut app = populated();
        assert_eq!(
            app.on_mouse(MouseAction::Key(KeyCode::Char('e'), KeyModifiers::NONE)),
            Action::Exec {
                agent: "builder".into()
            }
        );

        assert_eq!(
            app.on_mouse(MouseAction::Key(KeyCode::Char('d'), KeyModifiers::NONE)),
            Action::None
        );
        assert!(matches!(app.modal, Some(Modal::ConfirmDelete { .. })));
        assert_eq!(
            app.on_mouse(MouseAction::Key(KeyCode::Char('y'), KeyModifiers::NONE)),
            Action::Delete {
                agent: "builder".into()
            }
        );
    }

    #[test]
    fn mouse_forward_actions_select_edit_and_delete_the_target() {
        let mut app = App::new();
        app.view = View::Forwards;
        app.set_forwards(vec![
            ForwardEntry {
                id: 10,
                agent: "first".into(),
                local: "127.0.0.1:8000".into(),
                guest_port: 80,
                status: None,
            },
            ForwardEntry {
                id: 20,
                agent: "second".into(),
                local: "127.0.0.1:9000".into(),
                guest_port: 90,
                status: None,
            },
        ]);

        assert_eq!(app.on_mouse(MouseAction::Select(RowTarget::Forward(20))), Action::None);
        assert_eq!(app.forward_selected, 1);
        assert_eq!(app.on_mouse(MouseAction::Primary(RowTarget::Forward(20))), Action::None);
        assert!(matches!(
            app.modal,
            Some(Modal::PortForward(ForwardForm { replace: Some(20), .. }))
        ));

        app.modal = None;
        assert_eq!(
            app.on_mouse(MouseAction::Key(KeyCode::Char('d'), KeyModifiers::CONTROL)),
            Action::DeleteForward { id: 20 }
        );
    }

    #[test]
    fn forward_selection_follows_its_stable_id_when_rows_reorder() {
        let mut app = App::new();
        let entry = |id, agent: &str| ForwardEntry {
            id,
            agent: agent.into(),
            local: format!("127.0.0.1:{id}"),
            guest_port: 80,
            status: None,
        };
        app.set_forwards(vec![entry(10, "first"), entry(20, "second")]);
        app.on_mouse(MouseAction::Select(RowTarget::Forward(20)));

        app.set_forwards(vec![entry(5, "new"), entry(20, "second"), entry(10, "first")]);

        assert_eq!(app.forward_selected, 1);
        assert_eq!(app.forwards[app.forward_selected].id, 20);
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
        assert!(matches!(app.modal, Some(Modal::NewSession(_))));
        assert_eq!(app.on_key(key(KeyCode::Enter)), Action::None);
        assert!(matches!(&app.modal, Some(Modal::NewSession(form)) if form.error.is_some()));
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
                model_selection: ModelSelection::default(),
            }
        );
        assert!(app.modal.is_none());
    }

    #[test]
    fn new_session_form_types_model_and_effort_and_shows_manifest_defaults() {
        let mut app = App::new();
        app.apply_snapshot(
            vec![agent_named(
                "worker",
                "\x20   - type: claudeCode\n\x20     auth: mediated\n\x20     defaults:\n\x20       model: fable\n\x20       effort: high\n",
            )],
            Vec::new(),
        );
        app.on_key(key(KeyCode::Char('n')));
        let form = |app: &App| match &app.modal {
            Some(Modal::NewSession(form)) => form.clone(),
            _ => panic!("expected the NewSession modal"),
        };
        assert_eq!(form(&app).field, SessionField::Name);
        assert_eq!(form(&app).model_default(), Some("fable"));
        assert_eq!(form(&app).effort_default(), Some("high"));
        assert_eq!(app.hints(), &NEW_SESSION_HINTS);

        app.on_key(key(KeyCode::Char('s')));
        app.on_key(key(KeyCode::Tab));
        assert_eq!(form(&app).field, SessionField::Model);
        for character in "gpt 5.4".chars() {
            app.on_key(key(KeyCode::Char(character)));
        }
        assert_eq!(form(&app).model, "gpt 5.4", "typed input is kept as typed");
        assert_eq!(app.on_key(key(KeyCode::Enter)), Action::None);
        let error = form(&app).error.expect("an invalid model is reported, not reshaped");
        assert!(error.contains("model must be 1-128"), "{error}");
        app.on_key(key(KeyCode::Backspace));
        app.on_key(key(KeyCode::Backspace));
        app.on_key(key(KeyCode::Backspace));
        app.on_key(key(KeyCode::Backspace));
        for character in "5.4".chars() {
            app.on_key(key(KeyCode::Char(character)));
        }
        assert_eq!(form(&app).model, "gpt5.4");
        assert_eq!(form(&app).error, None, "editing clears the error");
        app.on_key(key(KeyCode::Down));
        assert_eq!(form(&app).field, SessionField::Effort);
        app.on_key(key(KeyCode::Char('x')));
        app.on_key(key(KeyCode::Backspace));
        app.on_key(key(KeyCode::BackTab));
        app.on_key(key(KeyCode::Up));
        assert_eq!(form(&app).field, SessionField::Name);
        assert_eq!(form(&app).name, "s");

        assert_eq!(
            app.on_key(key(KeyCode::Enter)),
            Action::CreateSession {
                agent: "worker".into(),
                session: SessionName::new("s").expect("valid name"),
                harness: Harness::ClaudeCode,
                model_selection: ModelSelection {
                    model: Some(Model::new("gpt5.4").expect("model")),
                    effort: None,
                },
            },
            "an empty effort leaves the manifest default to the daemon"
        );
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
        let Some(Modal::NewSession(form)) = &app.modal else {
            panic!("expected the NewSession modal");
        };
        assert_eq!(form.harness, 1);
        app.on_key(key(KeyCode::Right));
        let Some(Modal::NewSession(form)) = &app.modal else {
            panic!("expected the NewSession modal");
        };
        assert_eq!(form.harness, 0);
        app.on_key(key(KeyCode::Left));
        app.on_key(key(KeyCode::Left));
        let Some(Modal::NewSession(form)) = &app.modal else {
            panic!("expected the NewSession modal");
        };
        assert_eq!(form.harness, 0, "the picker wraps in both directions");
        app.on_key(key(KeyCode::Char('s')));
        app.on_key(key(KeyCode::Char('1')));
        assert_eq!(
            app.on_key(key(KeyCode::Enter)),
            Action::CreateSession {
                agent: "worker".into(),
                session: SessionName::new("s1").expect("valid name"),
                harness: Harness::ClaudeCode,
                model_selection: ModelSelection::default(),
            }
        );
    }

    fn candidates(entries: &[(&str, &str)]) -> Vec<ManifestCandidate> {
        entries
            .iter()
            .map(|(directory, name)| {
                ManifestCandidate::new(PathBuf::from(directory).join("agent.yaml"), Ok((*name).to_owned()))
            })
            .collect()
    }

    fn create_form(app: &App) -> &CreateForm {
        let Some(Modal::CreateAgent(form)) = &app.modal else {
            panic!("expected the CreateAgent modal");
        };
        form
    }

    #[test]
    fn create_key_requests_manifest_discovery_even_without_agents() {
        let mut app = App::new();
        app.apply_snapshot(Vec::new(), Vec::new());
        assert_eq!(app.hints(), &EMPTY_HINTS);
        assert_eq!(app.on_key(key(KeyCode::Char('c'))), Action::OpenCreate);
        let mut app = populated();
        assert_eq!(app.on_key(key(KeyCode::Char('c'))), Action::OpenCreate);
        app.select_index(1);
        assert_eq!(app.on_key(key(KeyCode::Char('c'))), Action::OpenCreate);
    }

    #[test]
    fn discovery_results_wait_for_an_open_view_to_close() {
        let mut app = populated();
        app.manifests_discovered(candidates(&[("/sources/stale", "stale")]));
        assert!(app.modal.is_none());

        app.discovering = true;
        app.on_key(key(KeyCode::Char('s')));
        app.manifests_discovered(candidates(&[("/sources/worker", "worker")]));
        assert!(!app.discovering);
        assert!(app.modal.is_none());
        app.open_queued_create();
        assert!(app.modal.is_none());

        app.on_key(key(KeyCode::Esc));
        app.open_queued_create();
        assert_eq!(create_form(&app).placeholder(), Some("worker"));
        assert!(app.queued_candidates.is_none());

        let mut app = populated();
        app.discovering = true;
        app.manifests_discovered(candidates(&[("/sources/worker", "worker")]));
        assert_eq!(create_form(&app).placeholder(), Some("worker"));
    }

    #[test]
    fn open_create_preselects_the_highlighted_agents_manifest() {
        let mut app = populated();
        for agent in &mut app.agents {
            if agent.metadata.name == "worker" {
                agent.status.provenance = Some(agent::Provenance {
                    source_directory: PathBuf::from("/sources/worker"),
                    manifest_path: Some(PathBuf::from("/sources/worker/agent.nested.yaml")),
                    env_file: None,
                });
            }
        }
        app.select_index(3);
        let mut discovered = candidates(&[("/sources/builder", "builder"), ("/sources/worker", "worker")]);
        discovered.push(ManifestCandidate::new(
            PathBuf::from("/sources/worker/agent.nested.yaml"),
            Ok("worker-nested".into()),
        ));
        app.open_create(discovered);
        let form = create_form(&app);
        assert_eq!(form.agent, 1);
        assert_eq!(form.variant, 1);
        assert_eq!(form.variant_label(), Some("nested".into()));
        assert_eq!(form.placeholder(), Some("worker-nested"));
        assert_eq!(app.hints(), &CREATE_AGENT_HINTS);
    }

    #[test]
    fn create_form_submits_the_placeholder_name_when_nothing_is_typed() {
        let mut app = populated();
        app.open_create(candidates(&[("/sources/fresh", "fresh")]));
        let Action::CreateAgent {
            manifest,
            name,
            env_file,
            ..
        } = app.on_key(key(KeyCode::Enter))
        else {
            panic!("expected a CreateAgent action");
        };
        assert_eq!(manifest, PathBuf::from("/sources/fresh/agent.yaml"));
        assert_eq!(name, "fresh");
        assert_eq!(env_file, None);
        assert!(app.modal.is_none());
    }

    #[test]
    fn create_form_accepts_an_environment_file_path() {
        let mut app = populated();
        app.open_create(candidates(&[("/sources/fresh", "fresh")]));
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Tab));
        assert_eq!(create_form(&app).field, CreateField::EnvironmentFile);
        for character in "../private/fresh.env".chars() {
            app.on_key(key(KeyCode::Char(character)));
        }
        app.on_key(key(KeyCode::Char('x')));
        app.on_key(key(KeyCode::Backspace));

        let Action::CreateAgent { env_file, .. } = app.on_key(key(KeyCode::Enter)) else {
            panic!("expected a CreateAgent action");
        };
        assert_eq!(env_file, Some(PathBuf::from("../private/fresh.env")));
    }

    #[test]
    fn create_form_placeholder_follows_selection_and_typed_names_win() {
        let mut app = populated();
        app.open_create(candidates(&[("/a", "alpha"), ("/b", "beta")]));
        assert_eq!(create_form(&app).placeholder(), Some("alpha"));
        app.on_key(key(KeyCode::Right));
        assert_eq!(create_form(&app).placeholder(), Some("beta"));
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Char('m')));
        app.on_key(key(KeyCode::Char('E')));
        app.on_key(key(KeyCode::Char('y')));
        assert_eq!(create_form(&app).name, "my");
        let Action::CreateAgent { manifest, name, .. } = app.on_key(key(KeyCode::Enter)) else {
            panic!("expected a CreateAgent action");
        };
        assert_eq!(manifest, PathBuf::from("/b/agent.yaml"));
        assert_eq!(name, "my");
    }

    #[test]
    fn create_form_reports_duplicates_and_invalid_names_on_submit() {
        let mut app = populated();
        app.open_create(candidates(&[("/sources/worker", "worker")]));
        assert_eq!(app.on_key(key(KeyCode::Enter)), Action::None);
        assert_eq!(
            create_form(&app).error.as_deref(),
            Some("agent \"worker\" already exists")
        );
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Char('-')));
        assert_eq!(app.on_key(key(KeyCode::Enter)), Action::None);
        let error = create_form(&app).error.as_deref().expect("invalid name error");
        assert!(error.starts_with("name:"));
        app.on_key(key(KeyCode::Backspace));
        app.on_key(key(KeyCode::Char('w')));
        app.on_key(key(KeyCode::Char('2')));
        let Action::CreateAgent { name, .. } = app.on_key(key(KeyCode::Enter)) else {
            panic!("expected a CreateAgent action");
        };
        assert_eq!(name, "w2");
    }

    #[test]
    fn create_form_blocks_unreadable_manifests_and_empty_pickers() {
        let mut app = populated();
        app.open_create(vec![ManifestCandidate::new(
            PathBuf::from("/gone/agent.yaml"),
            Err("manifest cannot be decoded".into()),
        )]);
        assert_eq!(create_form(&app).placeholder(), None);
        app.on_key(key(KeyCode::Enter));
        assert_eq!(create_form(&app).error.as_deref(), Some("manifest cannot be decoded"));
        app.on_key(key(KeyCode::Esc));
        assert!(app.modal.is_none());
        app.open_create(Vec::new());
        app.on_key(key(KeyCode::Enter));
        assert!(create_form(&app).error.is_some());
    }

    #[test]
    fn create_form_keeps_invalid_variants_visible_but_blocks_submission() {
        let mut app = populated();
        app.open_create(vec![
            ManifestCandidate::new(PathBuf::from("/sources/full/agent.yaml"), Ok("full".into())),
            ManifestCandidate::new(
                PathBuf::from("/sources/full/agent.broken.yaml"),
                Err("agent.broken.yaml: missing base".into()),
            ),
        ]);
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Right));
        let form = create_form(&app);
        assert_eq!(form.variant_label(), Some("broken".into()));
        assert_eq!(form.placeholder(), None);

        assert_eq!(app.on_key(key(KeyCode::Enter)), Action::None);
        assert_eq!(
            create_form(&app).error.as_deref(),
            Some("agent.broken.yaml: missing base")
        );
    }

    #[test]
    fn create_form_selection_wraps_and_clears_errors() {
        let mut app = populated();
        let mut discovered = candidates(&[("/a", "builder"), ("/b", "beta")]);
        discovered.push(ManifestCandidate::new(
            PathBuf::from("/a/agent.nested.yaml"),
            Ok("builder-nested".into()),
        ));
        app.open_create(discovered);
        app.on_key(key(KeyCode::Enter));
        assert!(create_form(&app).error.is_some());
        app.on_key(key(KeyCode::Left));
        let form = create_form(&app);
        assert_eq!(form.agent, 1);
        assert_eq!(form.variant, 0);
        assert_eq!(form.error, None);
        app.on_key(key(KeyCode::Tab));
        assert_eq!(create_form(&app).field, CreateField::Variant);
        app.on_key(key(KeyCode::Right));
        assert_eq!(create_form(&app).variant, 0);
        app.on_key(key(KeyCode::BackTab));
        app.on_key(key(KeyCode::Right));
        assert_eq!(create_form(&app).agent, 0);
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Right));
        assert_eq!(create_form(&app).variant, 1);
        assert_eq!(create_form(&app).variant_label(), Some("nested".into()));
        assert_eq!(create_form(&app).placeholder(), Some("builder-nested"));
    }

    #[test]
    fn create_form_cycles_fields_with_arrows_and_tab() {
        let mut app = populated();
        app.open_create(candidates(&[("/sources/fresh", "fresh")]));
        assert_eq!(create_form(&app).field, CreateField::Agent);

        app.on_key(key(KeyCode::Down));
        assert_eq!(create_form(&app).field, CreateField::Variant);
        app.on_key(key(KeyCode::Down));
        assert_eq!(create_form(&app).field, CreateField::Name);
        app.on_key(key(KeyCode::Up));
        assert_eq!(create_form(&app).field, CreateField::Variant);
        app.on_key(key(KeyCode::Tab));
        assert_eq!(create_form(&app).field, CreateField::Name);
        app.on_key(key(KeyCode::BackTab));
        assert_eq!(create_form(&app).field, CreateField::Variant);
    }

    #[test]
    fn select_agent_moves_the_selection_to_that_row() {
        let mut app = populated();
        app.select_agent("worker");
        assert_eq!(app.selected_index(), Some(2));
        app.select_agent("missing");
        assert_eq!(app.selected_index(), Some(2));
    }

    #[test]
    fn tones_reflect_agent_conditions_and_session_states() {
        let mut terminating = ready_agent("done");
        terminating.metadata.deletion_timestamp = Some(time::OffsetDateTime::now_utc());
        let mut app = App::new();
        app.apply_snapshot(
            vec![ready_agent("alive"), terminating, agent("fresh")],
            vec![
                session("alive", "up", "waitingForInput"),
                session("alive", "down", "failed"),
            ],
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
    fn forward_form_mirrors_an_empty_local_port_and_creates_on_enter() {
        let mut app = populated();
        assert_eq!(app.on_key(key(KeyCode::Char('f'))), Action::None);
        assert!(matches!(app.modal, Some(Modal::PortForward { .. })));
        app.on_key(key(KeyCode::Char('8')));
        app.on_key(key(KeyCode::Char('0')));
        let action = app.on_key(key(KeyCode::Enter));
        assert_eq!(
            action,
            Action::CreateForward {
                agent: "builder".into(),
                spec: ForwardSpec {
                    address: std::net::IpAddr::from([127, 0, 0, 1]),
                    local_port: 80,
                    guest_port: 80,
                },
                replace: None,
            }
        );
        assert!(app.modal.is_none());
    }

    #[test]
    fn forward_form_cycles_fields_and_reports_invalid_input() {
        let mut app = populated();
        app.on_key(key(KeyCode::Char('f')));
        app.on_key(key(KeyCode::Enter));
        assert!(matches!(
            app.modal,
            Some(Modal::PortForward(ForwardForm { error: Some(_), .. }))
        ));
        app.on_key(key(KeyCode::Tab));
        let Some(Modal::PortForward(form)) = &app.modal else {
            panic!("expected the PortForward modal");
        };
        assert_eq!(form.field, ForwardField::Address);
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Char('9')));
        app.on_key(key(KeyCode::Tab));
        app.on_key(key(KeyCode::Char('8')));
        app.on_key(key(KeyCode::Char('0')));
        let action = app.on_key(key(KeyCode::Enter));
        assert_eq!(
            action,
            Action::CreateForward {
                agent: "builder".into(),
                spec: ForwardSpec {
                    address: std::net::IpAddr::from([127, 0, 0, 1]),
                    local_port: 9,
                    guest_port: 80,
                },
                replace: None,
            }
        );
    }

    #[test]
    fn forwards_view_lists_deletes_and_edits_like_k9s() {
        let mut app = populated();
        app.set_forwards(vec![ForwardEntry {
            id: 7,
            agent: "worker".into(),
            local: "127.0.0.1:9090".into(),
            guest_port: 80,
            status: None,
        }]);
        app.on_key(key(KeyCode::Char('F')));
        assert_eq!(app.view, View::Forwards);
        assert_eq!(
            app.on_key(KeyEvent::new(KeyCode::Char('d'), KeyModifiers::CONTROL)),
            Action::DeleteForward { id: 7 }
        );
        app.on_key(key(KeyCode::Char('e')));
        let Some(Modal::PortForward(form)) = &app.modal else {
            panic!("expected the PortForward modal");
        };
        assert_eq!(form.replace, Some(7));
        assert_eq!(form.local, "9090");
        assert_eq!(form.guest, "80");
        app.on_key(key(KeyCode::Esc));
        assert!(app.modal.is_none());
        app.on_key(key(KeyCode::Char('q')));
        assert_eq!(app.view, View::Tree);
    }

    #[test]
    fn error_screen_keys_win_over_an_open_forwards_view() {
        let mut app = populated();
        app.on_key(key(KeyCode::Char('F')));
        app.error = Some("control plane unreachable".into());
        assert_eq!(app.on_key(key(KeyCode::Char('r'))), Action::Refresh);
        assert_eq!(app.on_key(key(KeyCode::Char('q'))), Action::Quit);
        assert_eq!(app.view, View::Forwards);
        app.error = None;
        app.on_key(key(KeyCode::Char('q')));
        assert_eq!(app.view, View::Tree);
    }

    #[test]
    fn rejected_forwards_reopen_the_form_with_their_values() {
        let spec = ForwardSpec {
            address: std::net::IpAddr::from([127, 0, 0, 1]),
            local_port: 0,
            guest_port: 5432,
        };
        let form = ForwardForm::rejected("worker".into(), &spec, Some(3), "boom".into());
        assert_eq!(form.agent, "worker");
        assert_eq!(form.address, "127.0.0.1");
        assert_eq!(form.local, "");
        assert_eq!(form.guest, "5432");
        assert_eq!(form.field, ForwardField::Address);
        assert_eq!(form.error.as_deref(), Some("boom"));
        assert_eq!(form.replace, Some(3));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn low_loopback_ports_get_the_wildcard_bind_hint() {
        let spec = ForwardSpec {
            address: std::net::IpAddr::from([127, 0, 0, 1]),
            local_port: 80,
            guest_port: 80,
        };
        let form = ForwardForm::rejected(
            "worker".into(),
            &spec,
            None,
            "bind: Permission denied (os error 13)".into(),
        );
        let error = form.error.expect("rejected form should keep its error");
        assert!(error.contains("macOS allows ports below 1024 only on 0.0.0.0"));

        let wildcard = ForwardSpec {
            address: std::net::IpAddr::from([0, 0, 0, 0]),
            ..spec
        };
        let form = ForwardForm::rejected("worker".into(), &wildcard, None, "Permission denied".into());
        assert_eq!(form.error.as_deref(), Some("Permission denied"));
    }

    #[test]
    fn agent_badges_list_forward_mappings() {
        let mut app = populated();
        app.set_forwards(vec![
            ForwardEntry {
                id: 1,
                agent: "worker".into(),
                local: "127.0.0.1:9090".into(),
                guest_port: 80,
                status: None,
            },
            ForwardEntry {
                id: 2,
                agent: "worker".into(),
                local: "0.0.0.0:80".into(),
                guest_port: 80,
                status: None,
            },
        ]);
        let views = app.render_rows();
        assert!(!views[0].badge.contains("ports:"));
        assert!(views[2].badge.contains("ports: 9090:80 0.0.0.0:80:80"));
    }

    #[test]
    fn describe_opens_a_detail_view_that_scrolls_and_closes() {
        let mut app = populated();
        app.on_key(key(KeyCode::Char('s')));
        let detail = app.detail_view().expect("agent detail");
        assert_eq!(detail.title, "agent/builder");
        app.on_key(key(KeyCode::Char('j')));
        assert_eq!(app.detail.as_ref().expect("agent detail").scroll, 1);
        app.on_key(key(KeyCode::Char('q')));
        assert!(app.detail.is_none());
        app.select_index(1);
        app.on_key(key(KeyCode::Char('s')));
        assert_eq!(app.detail_view().expect("session detail").title, "session/builder/b1");
    }

    #[test]
    fn open_detail_reads_the_latest_resource_snapshot() {
        let mut app = populated();
        app.select_index(1);
        app.on_key(key(KeyCode::Char('s')));
        assert!(
            app.detail_view()
                .expect("starting detail")
                .lines
                .iter()
                .any(|line| line == "State:      Starting")
        );

        app.apply_snapshot(
            vec![agent("worker"), agent("builder")],
            vec![
                session("worker", "s2", "working"),
                session("worker", "s1", "idle"),
                session("builder", "b1", "failed"),
            ],
        );

        assert!(
            app.detail_view()
                .expect("updated detail")
                .lines
                .iter()
                .any(|line| line == "State:      Failed")
        );
    }

    #[test]
    fn yaml_views_render_the_full_resource() {
        let mut app = populated();
        app.on_key(key(KeyCode::Char('y')));
        let detail = app.detail_view().expect("agent yaml");
        assert_eq!(detail.title, "agent/builder yaml");
        assert!(detail.lines.iter().any(|line| line == "kind: Agent"));
        assert!(detail.lines.iter().any(|line| line.contains("apiVersion:")));
        assert!(detail.lines.iter().any(|line| line.contains("harnesses:")));
        app.on_key(key(KeyCode::Char('q')));
        app.select_index(1);
        app.on_key(key(KeyCode::Char('y')));
        let detail = app.detail_view().expect("session yaml");
        assert_eq!(detail.title, "session/builder/b1 yaml");
        assert!(detail.lines.iter().any(|line| line.contains("harness: claudeCode")));
        assert!(detail.lines.iter().any(|line| line.contains("name: b1")));
    }
}
