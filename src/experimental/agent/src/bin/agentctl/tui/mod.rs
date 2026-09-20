mod app;
mod terminal;
#[cfg(test)]
mod uxprobe;
mod view;

use std::{
    collections::HashMap,
    io::IsTerminal as _,
    path::{Path, PathBuf},
    process::ExitCode,
    time::{Duration, Instant},
};

use agent::{
    Agent, Error, control_api::Client, control_plane::WaitPolicy, local::home::ControlPlaneHome, manifest,
    sessions::Session, sessions::SessionName, sessions::SessionRequest,
};
use crossterm::event::{
    Event, EventStream, KeyCode, KeyEventKind, KeyModifiers, MouseButton, MouseEvent, MouseEventKind,
};
use futures_util::StreamExt as _;
use ignore::WalkBuilder;
use sandbox::terminal::TerminalAttachOutcome;

use crate::CommandResult;
use crate::forward::{ForwardSpec, PortForward};
use crate::progress::Wait;
use agent::manifest::MANIFEST_FILE;
use app::{Action, App, CreateForm, ForwardEntry, ForwardForm, ManifestCandidate, Modal, MouseAction, RowTarget};
use terminal::Tui;
use view::{HitMap, HitTarget, WheelTarget};

const REFRESH_INTERVAL: Duration = Duration::from_secs(2);
const DOUBLE_CLICK_INTERVAL: Duration = Duration::from_millis(500);
/// Deepest directory level below the working directory searched for manifests.
const DISCOVERY_DEPTH: usize = 8;

enum Input {
    Event(Option<std::io::Result<Event>>),
    Tick,
    Refreshed(FetchOutcome),
    ForwardCreated(CreateOutcome),
    ManifestsDiscovered(Vec<ManifestCandidate>),
}

/// Completion of one background forward creation.
type CreateOutcome = (String, ForwardSpec, Option<u64>, Result<PortForward, Error>);
type FetchOutcome = Result<(Vec<Agent>, Vec<Session>), Error>;

#[derive(Default)]
struct MouseInput {
    last_row: Option<(RowTarget, Instant)>,
    position: Option<(u16, u16)>,
}

impl MouseInput {
    fn reset(&mut self) {
        self.last_row = None;
    }

    const fn position(&self) -> Option<(u16, u16)> {
        self.position
    }

    fn double_click(&mut self, row: &RowTarget, now: Instant) -> bool {
        let double = self
            .last_row
            .as_ref()
            .is_some_and(|(previous, at)| previous == row && now.duration_since(*at) <= DOUBLE_CLICK_INTERVAL);
        if double {
            self.reset();
        } else {
            self.last_row = Some((row.clone(), now));
        }
        double
    }

    fn action(&mut self, event: MouseEvent, hit_map: &HitMap, app: &mut App, now: Instant) -> Action {
        self.position = Some((event.column, event.row));
        if !event.modifiers.is_empty() {
            self.reset();
            return Action::None;
        }
        match event.kind {
            MouseEventKind::Down(MouseButton::Left) => {
                let Some(target) = hit_map.click_at(event.column, event.row) else {
                    self.reset();
                    return Action::None;
                };
                match target {
                    HitTarget::Action(action) => {
                        self.reset();
                        app.on_mouse(action)
                    }
                    HitTarget::Row(row) => {
                        if self.double_click(&row, now) {
                            app.on_mouse(MouseAction::Primary(row))
                        } else {
                            app.on_mouse(MouseAction::Select(row))
                        }
                    }
                }
            }
            MouseEventKind::ScrollUp | MouseEventKind::ScrollDown => {
                self.reset();
                let delta = if event.kind == MouseEventKind::ScrollUp { -1 } else { 1 };
                match hit_map.wheel_at(event.column, event.row) {
                    Some(WheelTarget::Tree) => app.on_mouse(MouseAction::MoveTree(delta)),
                    Some(WheelTarget::Forwards) => app.on_mouse(MouseAction::MoveForward(delta)),
                    Some(WheelTarget::Detail) => app.on_mouse(MouseAction::ScrollDetail(delta)),
                    None => Action::None,
                }
            }
            MouseEventKind::Down(_) | MouseEventKind::ScrollLeft | MouseEventKind::ScrollRight => {
                self.reset();
                Action::None
            }
            MouseEventKind::Up(_) | MouseEventKind::Drag(_) | MouseEventKind::Moved => Action::None,
        }
    }
}

#[allow(clippy::too_many_lines)]
pub(crate) async fn run(home: &ControlPlaneHome, client: &Client) -> CommandResult<ExitCode> {
    if !std::io::stdin().is_terminal() || !std::io::stdout().is_terminal() {
        return Err(Error::Invalid("tui requires an interactive local terminal".into()).into());
    }
    let mut app = App::new();
    let mut forwards = ActiveForwards::default();
    let (created_tx, mut created_rx) = tokio::sync::mpsc::unbounded_channel::<CreateOutcome>();
    let (discovered_tx, mut discovered_rx) = tokio::sync::mpsc::unbounded_channel::<Vec<ManifestCandidate>>();
    let (refreshed_tx, mut refreshed_rx) = tokio::sync::mpsc::unbounded_channel::<FetchOutcome>();
    let mut tui = Tui::enter()?;
    let mut events = EventStream::new();
    let mut mouse = MouseInput::default();
    let mut tick = tokio::time::interval_at(tokio::time::Instant::now() + REFRESH_INTERVAL, REFRESH_INTERVAL);
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    request_refresh(&mut app, refreshed_tx.clone(), home.socket_path());
    loop {
        app.open_queued_create();
        app.set_forwards(forwards.entries());
        let hit_map = tui.draw(&app)?;
        tui.set_pointer_for(&hit_map, mouse.position())?;
        let input = tokio::select! {
            event = events.next() => Input::Event(event),
            _ = tick.tick() => Input::Tick,
            Some(outcome) = refreshed_rx.recv() => Input::Refreshed(outcome),
            Some(outcome) = created_rx.recv() => Input::ForwardCreated(outcome),
            Some(candidates) = discovered_rx.recv() => Input::ManifestsDiscovered(candidates),
        };
        let action = match input {
            Input::Tick => {
                mouse.reset();
                request_refresh(&mut app, refreshed_tx.clone(), home.socket_path());
                continue;
            }
            Input::Refreshed(outcome) => {
                mouse.reset();
                if refresh_finished(&mut app, outcome) {
                    request_refresh(&mut app, refreshed_tx.clone(), home.socket_path());
                }
                continue;
            }
            Input::ForwardCreated(outcome) => {
                mouse.reset();
                forward_created(&mut app, &mut forwards, outcome);
                continue;
            }
            Input::ManifestsDiscovered(candidates) => {
                mouse.reset();
                app.manifests_discovered(candidates);
                continue;
            }
            Input::Event(None) => {
                tui.restore()?;
                return Ok(ExitCode::SUCCESS);
            }
            Input::Event(Some(Err(error))) => {
                tui.restore()?;
                return Err(Error::from(error).into());
            }
            Input::Event(Some(Ok(Event::Key(key)))) if key.kind == KeyEventKind::Press => {
                mouse.reset();
                if key.code == KeyCode::Char('c') && key.modifiers.contains(KeyModifiers::CONTROL) {
                    tui.restore()?;
                    return Ok(ExitCode::SUCCESS);
                }
                app.on_key(key)
            }
            Input::Event(Some(Ok(Event::Mouse(event)))) => mouse.action(event, &hit_map, &mut app, Instant::now()),
            Input::Event(Some(Ok(_))) => {
                mouse.reset();
                continue;
            }
        };
        match action {
            Action::None => {}
            Action::Quit => {
                tui.restore()?;
                return Ok(ExitCode::SUCCESS);
            }
            Action::Refresh => request_refresh(&mut app, refreshed_tx.clone(), home.socket_path()),
            Action::Delete { agent } => {
                if let Err(error) = client.delete(&agent).await {
                    app.error = Some(error.to_string());
                }
                request_refresh(&mut app, refreshed_tx.clone(), home.socket_path());
            }
            Action::OpenCreate => {
                if !app.discovering {
                    app.discovering = true;
                    spawn_discovery(discovered_tx.clone(), app.agents.clone());
                }
            }
            Action::CreateAgent {
                manifest,
                name,
                env_file,
                form,
            } => {
                if create(&mut app, client, manifest, name, env_file, form).await? {
                    request_refresh(&mut app, refreshed_tx.clone(), home.socket_path());
                }
            }
            Action::CreateForward { agent, spec, replace } => {
                if let Some(id) = replace {
                    forwards.remove(id);
                }
                app.creating += 1;
                spawn_create(home, created_tx.clone(), agent, spec, replace);
            }
            Action::DeleteForward { id } => forwards.remove(id),
            action => {
                drop(events);
                suspended(&mut app, &mut tui, home, client, action).await?;
                events = EventStream::new();
                request_refresh(&mut app, refreshed_tx.clone(), home.socket_path());
            }
        }
    }
}

/// Process-owned port forwards keyed by a stable per-run identity.
#[derive(Default)]
struct ActiveForwards {
    next_id: u64,
    active: Vec<(u64, String, PortForward)>,
}

impl ActiveForwards {
    fn push(&mut self, agent: String, forward: PortForward) {
        let id = self.next_id;
        self.next_id += 1;
        self.active.push((id, agent, forward));
    }

    fn remove(&mut self, id: u64) {
        self.active.retain(|(entry, _, _)| *entry != id);
    }

    fn entries(&self) -> Vec<ForwardEntry> {
        self.active
            .iter()
            .map(|(id, agent, forward)| ForwardEntry {
                id: *id,
                agent: agent.clone(),
                local: forward.local_address().to_string(),
                guest_port: forward.spec().guest_port,
                status: forward.status(),
            })
            .collect()
    }
}

/// Creates a forward off the event loop so provisioning never freezes the UI.
fn spawn_create(
    home: &ControlPlaneHome,
    outcomes: tokio::sync::mpsc::UnboundedSender<CreateOutcome>,
    agent: String,
    spec: ForwardSpec,
    replace: Option<u64>,
) {
    let home_path = home.path().to_path_buf();
    let socket_path = home.socket_path();
    tokio::task::spawn_local(async move {
        let client = Client::for_path(socket_path);
        let result = async {
            // The TUI has no place to render progress while on screen, so a failing
            // first pass is reported instead of waited through.
            let target = client.ensure_execution(&agent, WaitPolicy::FirstPass, None).await?;
            PortForward::start(home_path, target.sandbox, spec.clone()).await
        }
        .await;
        let _ = outcomes.send((agent, spec, replace, result));
    });
}

/// Discovers create-agent candidates off the event loop so a slow filesystem never freezes the UI.
fn spawn_discovery(outcomes: tokio::sync::mpsc::UnboundedSender<Vec<ManifestCandidate>>, agents: Vec<Agent>) {
    tokio::task::spawn_local(async move {
        let candidates = manifest_candidates(std::env::current_dir().ok(), &agents).await;
        let _ = outcomes.send(candidates);
    });
}

/// Assembles create-agent candidates from the working tree and recorded Agent manifests.
///
/// Every manifest below the working directory is offered, or below the repository
/// root when the working directory is inside a git repository, skipping hidden and
/// ignored directories; a recorded manifest that is unreadable stays listed so its
/// error is visible.
async fn manifest_candidates(current_directory: Option<PathBuf>, agents: &[Agent]) -> Vec<ManifestCandidate> {
    let agents = agents.to_vec();
    tokio::task::spawn_blocking(move || manifest_candidates_blocking(current_directory.as_deref(), &agents))
        .await
        .unwrap_or_default()
}

fn manifest_candidates_blocking(current_directory: Option<&Path>, agents: &[Agent]) -> Vec<ManifestCandidate> {
    let mut recorded: Vec<PathBuf> = agents
        .iter()
        .filter_map(|agent| agent.status.provenance.as_ref())
        .map(agent::Provenance::manifest_or_default)
        .collect();
    recorded.sort();
    recorded.dedup();
    let found = current_directory.map_or_else(Vec::new, working_tree_manifests);
    let paths = found
        .into_iter()
        .map(|path| (path, false))
        .chain(recorded.into_iter().map(|path| (path, true)));
    let mut seen = HashMap::<PathBuf, usize>::new();
    let mut candidates = Vec::<ManifestCandidate>::new();
    for (path, recorded) in paths {
        let canonical = std::fs::canonicalize(&path).unwrap_or_else(|_| path.clone());
        if let Some(index) = seen.get(&canonical).copied() {
            candidates[index].add_equivalent_path(path);
            continue;
        }
        let name = match manifest::resolve(&path) {
            Ok(resolved) => Ok(resolved.agent.metadata.name),
            Err(error) if recorded || path.exists() => Err(error.to_string()),
            Err(_) => continue,
        };
        seen.insert(canonical, candidates.len());
        candidates.push(ManifestCandidate::new(path, name));
    }
    candidates
}

/// Returns the root of the git repository containing `directory`, if any.
///
/// A linked worktree keeps `.git` as a file, so only presence is checked.
fn repository_root(directory: &Path) -> Option<&Path> {
    directory.ancestors().find(|ancestor| ancestor.join(".git").exists())
}

/// Lists Agents and their variant manifests below `directory`, or below its git repository root.
///
/// The walk honors ignore files for directories and finds complete `agent.yaml`
/// manifests. Each Agent directory is then enumerated directly so checkout-local,
/// ignored `agent.<variant>.yaml` siblings remain discoverable.
fn working_tree_manifests(directory: &Path) -> Vec<PathBuf> {
    let root = repository_root(directory).unwrap_or(directory);
    let mut found: Vec<PathBuf> = WalkBuilder::new(root)
        .max_depth(Some(DISCOVERY_DEPTH))
        .require_git(false)
        .follow_links(false)
        .build()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_some_and(|kind| kind.is_file()) && entry.file_name() == MANIFEST_FILE)
        .flat_map(|entry| {
            let base = entry.into_path();
            let Some(parent) = base.parent() else {
                return vec![base];
            };
            let mut manifests = std::fs::read_dir(parent)
                .into_iter()
                .flatten()
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .filter(|path| manifest::is_manifest_filename(path))
                .collect::<Vec<_>>();
            manifests.sort_by_key(|path| (path.file_name().is_none_or(|name| name != MANIFEST_FILE), path.clone()));
            manifests
        })
        .collect();
    found.sort_by_key(|path| {
        (
            path.components().count(),
            path.parent().map(Path::to_path_buf),
            path.file_name().is_none_or(|name| name != MANIFEST_FILE),
            path.clone(),
        )
    });
    found
}

/// Applies the manifest under the chosen name; a rejection reopens the form with the error.
async fn create(
    app: &mut App,
    client: &Client,
    manifest: PathBuf,
    name: String,
    env_file: Option<PathBuf>,
    mut form: CreateForm,
) -> CommandResult<bool> {
    match create_agent(client, manifest, name, env_file).await {
        Ok(applied) => {
            app.selection = Some(app::TreeRowId::Agent(applied));
            Ok(true)
        }
        Err(error) => {
            form.error = Some(error.to_string());
            app.modal = Some(Modal::CreateAgent(form));
            Ok(false)
        }
    }
}

async fn create_agent(
    client: &Client,
    manifest: PathBuf,
    name: String,
    env_file: Option<PathBuf>,
) -> Result<String, Error> {
    let mut request = crate::read_apply_request(manifest, env_file)?;
    request.agent.metadata.name = name;
    request.create_only = true;
    let applied = client.apply(request).await?;
    Ok(applied.metadata.name)
}

/// Applies one completed background forward creation to the UI state.
fn forward_created(app: &mut App, forwards: &mut ActiveForwards, outcome: CreateOutcome) {
    let (agent, spec, replace, result) = outcome;
    app.creating = app.creating.saturating_sub(1);
    match result {
        Ok(forward) => forwards.push(agent, forward),
        Err(error) => {
            app.modal = Some(Modal::PortForward(ForwardForm::rejected(
                agent,
                &spec,
                replace,
                error.to_string(),
            )));
        }
    }
}

fn request_refresh(app: &mut App, outcomes: tokio::sync::mpsc::UnboundedSender<FetchOutcome>, socket_path: PathBuf) {
    match app.refresh {
        app::RefreshState::Idle => app.refresh = app::RefreshState::Fetching,
        app::RefreshState::Fetching | app::RefreshState::Queued => {
            app.refresh = app::RefreshState::Queued;
            return;
        }
    }
    tokio::task::spawn_local(async move {
        let client = Client::for_path(socket_path);
        let _ = outcomes.send(fetch(&client).await);
    });
}

fn refresh_finished(app: &mut App, outcome: FetchOutcome) -> bool {
    let queued = app.refresh == app::RefreshState::Queued;
    app.refresh = app::RefreshState::Idle;
    match outcome {
        Ok((agents, sessions)) => {
            app.error = None;
            app.poll_error = None;
            app.last_updated = Some(Instant::now());
            app.apply_snapshot(agents, sessions);
        }
        Err(error) => app.poll_error = Some(error.to_string()),
    }
    queued
}

async fn fetch(client: &Client) -> Result<(Vec<Agent>, Vec<Session>), Error> {
    Ok((client.list_agents().await?, client.list_sessions(None).await?))
}

async fn suspended(
    app: &mut App,
    tui: &mut Tui,
    home: &ControlPlaneHome,
    client: &Client,
    action: Action,
) -> CommandResult<()> {
    tui.suspend()?;
    let result = match action {
        Action::Attach { agent, session } => attach(home, client, &agent, session, SessionRequest::default()).await,
        Action::CreateSession {
            agent,
            session,
            harness,
            model_selection,
        } => {
            let request = SessionRequest {
                harness: Some(harness),
                model_selection,
                initial_prompt: None,
            };
            attach(home, client, &agent, session, request).await
        }
        Action::Exec { agent } => exec(home, client, &agent).await,
        _ => Ok(()),
    };
    tui.resume()?;
    if let Err(error) = result {
        app.error = Some(error.to_string());
    }
    Ok(())
}

async fn attach(
    home: &ControlPlaneHome,
    client: &Client,
    agent: &str,
    session: SessionName,
    request: SessionRequest,
) -> Result<(), Error> {
    let wait = Wait::start();
    let target = wait
        .until(client.ensure_session(agent, session, request, WaitPolicy::UntilReady, Some(&mut wait.sink())))
        .await?;
    agent::sessions::attach(home.path(), &target).await
}

async fn exec(home: &ControlPlaneHome, client: &Client, agent: &str) -> Result<(), Error> {
    let wait = Wait::start();
    let target = wait
        .until(client.ensure_execution(agent, WaitPolicy::UntilReady, Some(&mut wait.sink())))
        .await?;
    let command = ["bash".to_owned(), "-l".to_owned()];
    let spec = agent::sandbox::platform::execution_spec(&target.operating_system, &command, true)?;
    match agent::sandbox::attach_terminal(
        home.path(),
        &target.sandbox,
        sandbox::terminal::AttachTerminalRequest::new(spec),
    )
    .await?
    {
        TerminalAttachOutcome::Exited(_) | TerminalAttachOutcome::Detached => Ok(()),
        _ => Err(Error::Session(
            "terminal execution returned an unsupported outcome".into(),
        )),
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    fn manifest_yaml(name: &str) -> String {
        format!(
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
             \x20   - type: claudeCode\n\
             \x20     version: \"1.0.0\"\n\
             \x20     auth: mediated\n\
             \x20 secrets: []\n\
             \x20 network:\n\
             \x20   mode: mediated\n\
             \x20   allow: all\n"
        )
    }

    fn recorded_agent(name: &str, source: Option<&std::path::Path>) -> Agent {
        let mut agent = manifest::decode(manifest_yaml(name).as_bytes()).expect("test manifest should decode");
        agent.status.provenance = source.map(|directory| agent::Provenance {
            source_directory: directory.to_path_buf(),
            manifest_path: None,
            env_file: None,
        });
        agent
    }

    fn manifest_directory(root: &std::path::Path, name: &str, content: &str) -> PathBuf {
        let directory = root.join(name);
        std::fs::create_dir_all(&directory).expect("manifest directory should be created");
        std::fs::write(directory.join(MANIFEST_FILE), content).expect("manifest should be written");
        directory
    }

    fn empty_directory(root: &std::path::Path, name: &str) -> PathBuf {
        let directory = root.join(name);
        std::fs::create_dir_all(&directory).expect("directory should be created");
        directory
    }

    #[tokio::test(flavor = "local")]
    async fn discovery_offers_the_working_directory_and_recorded_manifests_once() {
        let root = tempfile::tempdir().expect("temporary directory");
        let cwd = manifest_directory(root.path(), "a-cwd", &manifest_yaml("local"));
        let broken = manifest_directory(root.path(), "broken", "not a manifest");
        let missing = empty_directory(root.path(), "missing");
        let recorded = manifest_directory(root.path(), "recorded", &manifest_yaml("recorded"));
        let agents = vec![
            recorded_agent("recorded", Some(&recorded)),
            recorded_agent("duplicate", Some(&cwd)),
            recorded_agent("missing", Some(&missing)),
            recorded_agent("broken", Some(&broken)),
            recorded_agent("unknown", None),
        ];

        let candidates = manifest_candidates(Some(cwd.clone()), &agents).await;

        assert_eq!(candidates.len(), 4);
        assert_eq!(candidates[0].path, cwd.join(MANIFEST_FILE));
        assert_eq!(candidates[0].name.as_deref(), Ok("local"));
        assert_eq!(candidates[1].path, broken.join(MANIFEST_FILE));
        assert!(candidates[1].name.is_err());
        assert_eq!(candidates[2].path, missing.join(MANIFEST_FILE));
        assert!(candidates[2].name.is_err());
        assert_eq!(candidates[3].path, recorded.join(MANIFEST_FILE));
        assert_eq!(candidates[3].name.as_deref(), Ok("recorded"));
    }

    #[cfg(unix)]
    #[tokio::test(flavor = "local")]
    async fn discovery_retains_equivalent_recorded_paths_for_picker_preselection() {
        let root = tempfile::tempdir().expect("temporary directory");
        let source = manifest_directory(root.path(), "source", &manifest_yaml("worker"));
        let alias = root.path().join("alias");
        std::os::unix::fs::symlink(&source, &alias).expect("manifest directory symlink");
        let recorded_manifest = alias.join(MANIFEST_FILE);
        let mut agent = recorded_agent("worker", Some(&alias));
        agent
            .status
            .provenance
            .as_mut()
            .expect("recorded provenance")
            .manifest_path = Some(recorded_manifest.clone());

        let candidates = manifest_candidates(Some(source.clone()), &[agent]).await;
        let form = CreateForm::new(candidates, Some(&recorded_manifest));

        assert_eq!(form.agents.len(), 1);
        assert_eq!(
            form.candidate().map(|candidate| candidate.path.as_path()),
            Some(source.join(MANIFEST_FILE).as_path())
        );
    }

    #[tokio::test(flavor = "local")]
    async fn discovery_walks_the_working_directory_tree_but_not_hidden_or_ignored_directories() {
        let root = tempfile::tempdir().expect("temporary directory");
        let cwd = manifest_directory(root.path(), "cwd", &manifest_yaml("top"));
        let nested = manifest_directory(&cwd, "examples/deeper", &manifest_yaml("nested"));
        let sibling = manifest_directory(&cwd, "examples/other", &manifest_yaml("other"));
        manifest_directory(&cwd, ".hidden", &manifest_yaml("hidden"));
        manifest_directory(&cwd, "target/ignored", &manifest_yaml("ignored"));
        std::fs::write(cwd.join(".gitignore"), "target/\n").expect("ignore file should be written");
        let agents = vec![recorded_agent("nested", Some(&nested))];

        let candidates = manifest_candidates(Some(cwd.clone()), &agents).await;

        let paths: Vec<&std::path::Path> = candidates.iter().map(|candidate| candidate.path.as_path()).collect();
        assert_eq!(
            paths,
            [
                cwd.join(MANIFEST_FILE),
                nested.join(MANIFEST_FILE),
                sibling.join(MANIFEST_FILE)
            ]
        );
        assert_eq!(candidates[1].name.as_deref(), Ok("nested"));
    }

    #[tokio::test(flavor = "local")]
    async fn discovery_includes_ignored_sibling_variants_and_their_resolution_errors() {
        let root = tempfile::tempdir().expect("temporary directory");
        let agent = manifest_directory(root.path(), "configured-agent", &manifest_yaml("default"));
        std::fs::write(agent.join(".gitignore"), "agent.*.yaml\n").expect("Agent ignore file");
        std::fs::write(
            agent.join("agent.mine.yaml"),
            "apiVersion: agents.platform/v1alpha1\nkind: AgentVariant\nextends: agent.yaml\nmetadata:\n  name: mine\n",
        )
        .expect("local variant");
        std::fs::write(
            agent.join("agent.broken.yaml"),
            "apiVersion: agents.platform/v1alpha1\nkind: AgentVariant\nextends: missing.yaml\nmetadata:\n  name: broken\n",
        )
        .expect("broken local variant");

        let candidates = manifest_candidates(Some(agent.clone()), &[]).await;

        assert_eq!(candidates.len(), 3);
        assert_eq!(candidates[0].path, agent.join(MANIFEST_FILE));
        assert_eq!(candidates[0].name.as_deref(), Ok("default"));
        assert_eq!(candidates[1].path, agent.join("agent.broken.yaml"));
        assert!(
            candidates[1]
                .name
                .as_ref()
                .is_err_and(|error| error.contains("extends must name"))
        );
        assert_eq!(candidates[2].path, agent.join("agent.mine.yaml"));
        assert_eq!(candidates[2].name.as_deref(), Ok("mine"));
    }

    #[tokio::test(flavor = "local")]
    async fn discovery_walks_the_whole_git_repository_from_a_nested_working_directory() {
        let root = tempfile::tempdir().expect("temporary directory");
        let repository = manifest_directory(root.path(), "repository", &manifest_yaml("root"));
        std::fs::write(repository.join(".git"), "gitdir: elsewhere\n").expect("worktree marker should be written");
        let cwd = empty_directory(&repository, "src/deep/inside");
        let sibling = manifest_directory(&repository, "agents/full", &manifest_yaml("full"));
        manifest_directory(root.path(), "outside", &manifest_yaml("outside"));

        let candidates = manifest_candidates(Some(cwd), &[]).await;

        let paths: Vec<&std::path::Path> = candidates.iter().map(|candidate| candidate.path.as_path()).collect();
        assert_eq!(paths, [repository.join(MANIFEST_FILE), sibling.join(MANIFEST_FILE)]);
    }

    #[tokio::test(flavor = "local")]
    async fn discovery_uses_the_recorded_manifest_filename() {
        let root = tempfile::tempdir().expect("temporary directory");
        let source = empty_directory(root.path(), "custom");
        let manifest = source.join("worker.yml");
        std::fs::write(&manifest, manifest_yaml("custom")).expect("manifest should be written");
        let mut agent = recorded_agent("custom", Some(&source));
        agent
            .status
            .provenance
            .as_mut()
            .expect("provenance should be recorded")
            .manifest_path = Some(manifest.clone());

        let candidates = manifest_candidates(None, &[agent]).await;

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].path, manifest);
        assert_eq!(candidates[0].name.as_deref(), Ok("custom"));
    }

    #[tokio::test(flavor = "local")]
    async fn a_manifest_less_working_directory_never_hides_its_recorded_source() {
        let root = tempfile::tempdir().expect("temporary directory");
        let cwd = empty_directory(root.path(), "cwd");
        let agents = vec![recorded_agent("worker", Some(&cwd))];

        let candidates = manifest_candidates(Some(cwd.clone()), &agents).await;

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].path, cwd.join(MANIFEST_FILE));
        assert!(candidates[0].name.is_err());
    }

    #[tokio::test(flavor = "local")]
    async fn discovery_skips_a_working_directory_without_a_manifest() {
        let root = tempfile::tempdir().expect("temporary directory");
        let cwd = empty_directory(root.path(), "cwd");

        assert!(manifest_candidates(Some(cwd), &[]).await.is_empty());
        assert!(manifest_candidates(None, &[]).await.is_empty());
    }

    #[tokio::test(flavor = "local")]
    async fn refresh_requests_coalesce_and_failure_preserves_last_snapshot() {
        let root = tempfile::tempdir().expect("temporary directory");
        let socket = root.path().join("missing.sock");
        let (sender, mut receiver) = tokio::sync::mpsc::unbounded_channel();
        let mut app = App::new();
        app.apply_snapshot(Vec::new(), Vec::new());

        request_refresh(&mut app, sender.clone(), socket.clone());
        request_refresh(&mut app, sender, socket);

        assert!(app.refreshing());
        assert_eq!(app.refresh, app::RefreshState::Queued);
        let outcome = receiver.recv().await.expect("refresh outcome");
        assert!(outcome.is_err());
        assert!(refresh_finished(&mut app, outcome));
        assert!(app.loaded, "the last successful snapshot remains active");
        assert!(app.poll_error.is_some());
        assert!(!app.refreshing());
    }

    #[test]
    fn successful_refresh_records_freshness_and_clears_poll_error() {
        let mut app = App::new();
        app.poll_error = Some("old failure".into());

        assert!(!refresh_finished(&mut app, Ok((Vec::new(), Vec::new()))));

        assert!(app.poll_error.is_none());
        assert!(app.last_updated.is_some());
        assert!(app.loaded);
    }

    #[test]
    fn row_primary_actions_require_two_clicks_on_the_same_row_in_time() {
        let mut mouse = MouseInput::default();
        let start = Instant::now();
        let second = RowTarget::Tree(app::TreeRowId::Agent("second".into()));
        let third = RowTarget::Tree(app::TreeRowId::Agent("third".into()));

        assert!(!mouse.double_click(&second, start));
        assert!(!mouse.double_click(&third, start + Duration::from_millis(100)));
        assert!(!mouse.double_click(&third, start + Duration::from_millis(700)));
        assert!(mouse.double_click(&third, start + Duration::from_millis(800)));
        assert!(!mouse.double_click(&RowTarget::Forward(3), start + Duration::from_millis(850)));
    }

    #[test]
    fn mouse_uses_clickable_hints_and_ignores_unsupported_input() {
        use ratatui::{Terminal, backend::TestBackend};

        let mut app = App::new();
        let mut state = view::ViewState::default();
        let mut hit_map = None;
        let mut terminal = Terminal::new(TestBackend::new(80, 12)).expect("test terminal");
        terminal
            .draw(|frame| hit_map = Some(view::render(frame, &app, &mut state)))
            .expect("draw");
        let hit_map = hit_map.expect("hit map");
        let mut mouse = MouseInput::default();
        let now = Instant::now();
        let event = |kind, modifiers| MouseEvent {
            kind,
            column: 0,
            row: 10,
            modifiers,
        };

        assert_eq!(
            mouse.action(
                event(MouseEventKind::Down(MouseButton::Left), KeyModifiers::NONE),
                &hit_map,
                &mut app,
                now,
            ),
            Action::OpenCreate
        );
        assert_eq!(mouse.position(), Some((0, 10)));
        for input in [
            event(MouseEventKind::Down(MouseButton::Right), KeyModifiers::NONE),
            event(MouseEventKind::Moved, KeyModifiers::NONE),
            event(MouseEventKind::Drag(MouseButton::Left), KeyModifiers::NONE),
            event(MouseEventKind::ScrollLeft, KeyModifiers::NONE),
            event(MouseEventKind::Down(MouseButton::Left), KeyModifiers::SHIFT),
        ] {
            assert_eq!(mouse.action(input, &hit_map, &mut app, now), Action::None);
        }
    }

    #[test]
    fn wheel_scrolls_details_only_inside_the_rendered_content() {
        use ratatui::{Terminal, backend::TestBackend};

        let mut app = App::new();
        app.detail = Some(app::Detail {
            target: app::TreeRowId::Agent("missing".into()),
            kind: app::DetailKind::Describe,
            scroll: 0,
        });
        let mut state = view::ViewState::default();
        let mut hit_map = None;
        let mut terminal = Terminal::new(TestBackend::new(40, 8)).expect("test terminal");
        terminal
            .draw(|frame| hit_map = Some(view::render(frame, &app, &mut state)))
            .expect("draw");
        let hit_map = hit_map.expect("hit map");
        let mut mouse = MouseInput::default();
        let now = Instant::now();
        let wheel = |column, row| MouseEvent {
            kind: MouseEventKind::ScrollDown,
            column,
            row,
            modifiers: KeyModifiers::NONE,
        };

        assert_eq!(mouse.action(wheel(1, 2), &hit_map, &mut app, now), Action::None);
        assert_eq!(app.detail.as_ref().map(|detail| detail.scroll), Some(0));
        assert_eq!(mouse.action(wheel(0, 1), &hit_map, &mut app, now), Action::None);
        assert_eq!(app.detail.as_ref().map(|detail| detail.scroll), Some(0));
    }
}
