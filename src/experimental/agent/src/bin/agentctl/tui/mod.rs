mod app;
mod open;
mod provisioning;
mod terminal;
mod view;

use std::{
    collections::HashMap,
    io::IsTerminal as _,
    path::{Path, PathBuf},
    process::ExitCode,
    time::{Duration, Instant},
};

use agent::{
    Agent, Error, control_api::Client, local::home::ControlPlaneHome, manifest, resources::Resources,
    sessions::Session, sessions::SessionName, sessions::SessionRequest, sessions::Turn, wait::Policy,
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
use app::{
    Action, App, CreateForm, ForwardEntry, ForwardForm, ManifestCandidate, Modal, MouseAction, PromptForm, RowTarget,
};
use open::{DesktopViewer, OpenTarget, SshSetup};
use terminal::Tui;
use view::{HitMap, HitTarget, WheelTarget};

/// Turns of the selected Session shown beside the tree.
const TRANSCRIPT_TURNS: usize = 3;
/// Pause before watching again after the daemon could not be reached.
const RECONNECT_INTERVAL: Duration = Duration::from_secs(1);
/// How often the screen is redrawn without input, so times keep moving.
const REDRAW_INTERVAL: Duration = Duration::from_secs(1);
const DOUBLE_CLICK_INTERVAL: Duration = Duration::from_millis(500);
/// Deepest directory level below the working directory searched for manifests.
const DISCOVERY_DEPTH: usize = 8;
/// Longest a background request waits for its outcome. The daemon keeps
/// working on the request after the TUI stops waiting.
const BACKGROUND_WAIT: Duration = Duration::from_mins(10);

enum Input {
    Event(Option<std::io::Result<Event>>),
    /// A watch reply, or why the daemon could not be watched.
    Resources(Result<Resources, String>),
    /// The lines of an Agent's followed provisioning.
    Provisioning {
        agent: String,
        lines: Vec<String>,
    },
    TranscriptLoaded {
        agent: String,
        session: SessionName,
        turns: Result<Vec<Turn>, String>,
    },
    PromptSent(PromptForm, Result<(), String>),
    /// A background Session change failed; its success shows through the watch.
    SessionChangeFailed(String),
    /// A Session was archived or unarchived, as recorded.
    ArchiveChanged(Session),
    ForwardCreated(CreateOutcome),
    ManifestsDiscovered(Vec<ManifestCandidate>),
    /// An action a finished step leads to, run in turn with the input already waiting.
    Then(Action),
    /// OpenSSH resolved an Agent's alias.
    SshChecked {
        agent: String,
        setup: SshSetup,
    },
    /// A background open finished; `waiting` is what it ends the wait for.
    Opened {
        waiting: Option<(String, OpenTarget)>,
        outcome: Result<OpenOutcome, String>,
    },
}

/// Sends the event loop what background work finished.
type Inputs = tokio::sync::mpsc::UnboundedSender<Input>;

/// Completion of one background forward creation.
type CreateOutcome = (String, ForwardSpec, Option<u64>, Result<PortForward, Error>);

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
    app.environment = open::Environment::detect();
    app.ssh_include = agent::ssh::UserInclude::for_home(home).ok();
    let mut forwards = ActiveForwards::default();
    let (inputs, mut background) = tokio::sync::mpsc::unbounded_channel();
    let mut tui = Tui::enter()?;
    let mut events = EventStream::new();
    let mut mouse = MouseInput::default();
    let mut follow = Follow::default();
    let mut redraw = tokio::time::interval(REDRAW_INTERVAL);
    redraw.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    spawn_watch(home.socket_path(), inputs.clone());
    loop {
        app.open_queued_create();
        app.set_forwards(forwards.entries());
        follow.sync(app.followed_agent(), home.socket_path(), &inputs);
        app.side_panel = view::shows_side_panel(tui.width());
        app.expire_notice(Instant::now());
        if let Some((agent, session)) = app.transcript_request() {
            spawn_transcript(home.socket_path(), inputs.clone(), agent, session);
        }
        if let Some(agent) = app.ssh_check_request() {
            spawn_ssh_check(inputs.clone(), agent);
        }
        let hit_map = tui.draw(&app)?;
        tui.set_pointer_for(&hit_map, mouse.position())?;
        let input = tokio::select! {
            event = events.next() => Input::Event(event),
            Some(input) = background.recv() => input,
            // Times in state and elapsed step times move without new input.
            _ = redraw.tick() => continue,
        };
        let action = match input {
            Input::Resources(Ok(resources)) => {
                app.connection_error = None;
                forwards.prune(&resources.agents);
                app.apply_snapshot(resources.agents, resources.sessions);
                continue;
            }
            Input::Resources(Err(error)) => {
                app.connection_error = Some(error);
                continue;
            }
            Input::Provisioning { agent, lines } => {
                app.provisioning_followed(&agent, lines);
                continue;
            }
            Input::TranscriptLoaded { agent, session, turns } => {
                app.transcript_loaded(&agent, &session, turns);
                continue;
            }
            Input::PromptSent(form, result) => {
                app.prompting = app.prompting.saturating_sub(1);
                if let Err(error) = result {
                    app.prompt_failed(form, error);
                }
                continue;
            }
            Input::SessionChangeFailed(error) => {
                app.error = Some(error);
                continue;
            }
            Input::ArchiveChanged(session) => {
                app.archive_changed(session, Instant::now());
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
            Input::Then(action) => action,
            Input::SshChecked { agent, setup } => {
                app.ssh_checked(&agent, setup);
                continue;
            }
            Input::Opened { waiting, outcome } => {
                open_finished(&mut app, &mut forwards, waiting, outcome);
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
            Action::Delete { agent } => {
                if let Err(error) = client.delete(&agent).await {
                    app.error = Some(error.to_string());
                }
            }
            Action::OpenCreate => {
                if !app.discovering {
                    app.discovering = true;
                    spawn_discovery(inputs.clone(), app.agents.clone());
                }
            }
            Action::CreateAgent {
                manifest,
                name,
                env_file,
                form,
            } => create(&mut app, client, manifest, name, env_file, form).await,
            Action::CreateForward { agent, spec, replace } => {
                if let Some(id) = replace {
                    forwards.remove(id);
                }
                app.creating += 1;
                spawn_create(home, inputs.clone(), agent, spec, replace);
            }
            Action::DeleteSession { agent, session } => {
                spawn_session_delete(home.socket_path(), inputs.clone(), agent, session);
            }
            Action::SetArchived {
                agent,
                session,
                archived,
            } => spawn_session_archive(home.socket_path(), inputs.clone(), agent, session, archived),
            Action::DeleteForward { id } => forwards.remove(id),
            Action::Prompt(form) => {
                app.prompting += 1;
                spawn_prompt(home.socket_path(), inputs.clone(), form);
            }
            Action::Open {
                agent,
                target: target @ OpenTarget::Editor(editor),
            } => {
                if app.start_opening(&agent, target, Instant::now()) {
                    let launcher = app.environment.launcher(editor).map(Path::to_path_buf);
                    let outside = Outside::Editor {
                        agent: agent.clone(),
                        editor,
                        launcher,
                    };
                    spawn_open(home, inputs.clone(), Some((agent, target)), outside, false);
                }
            }
            Action::Open {
                agent,
                target: OpenTarget::CopyAlias,
            } => {
                let alias = agent::ssh::alias(&agent);
                terminal::copy_to_clipboard(&alias)?;
                app.notice = Some((format!("copied {alias}"), Instant::now()));
            }
            Action::SetUpSsh { include, then } => {
                // One line in one small file: written at once, so nothing can
                // ask for the setup again while it is being written.
                let result = include
                    .install()
                    .map(|_| include.user_config.clone())
                    .map_err(|error| error.to_string());
                if let Some(next) = app.ssh_set_up(result, then, Instant::now()) {
                    let _ = inputs.send(Input::Then(next));
                }
            }
            Action::Open {
                agent,
                target: target @ OpenTarget::Desktop(viewer),
            } => {
                if app.start_opening(&agent, target, Instant::now()) {
                    // An Agent's desktop already forwarded is opened again rather than twice.
                    let outside = forwards.desktop(&agent, viewer).map_or_else(
                        || Outside::Desktop {
                            agent: agent.clone(),
                            viewer,
                        },
                        Outside::Forward,
                    );
                    let copy = app.environment.launch_blocked.is_some();
                    spawn_open(home, inputs.clone(), Some((agent, target)), outside, copy);
                }
            }
            Action::OpenUrl(url) => {
                let copy = app.environment.launch_blocked.is_some();
                spawn_open(home, inputs.clone(), None, Outside::Forward(url), copy);
            }
            action => {
                drop(events);
                suspended(&mut app, &mut tui, home, client, action).await?;
                events = EventStream::new();
            }
        }
    }
}

/// Whether `forward` dials the Sandbox the Agent named `agent` has now. An
/// Agent whose Sandbox is not materialized yet keeps what it has.
fn dials_current_sandbox(agents: &[Agent], agent: &str, forward: &PortForward) -> bool {
    agents.iter().any(|listed| {
        listed.metadata.name == agent
            && listed
                .status
                .sandbox
                .as_ref()
                .and_then(agent::sandbox::Assignment::id)
                .is_none_or(|id| Some(id) == forward.assignment().id())
    })
}

/// Process-owned port forwards keyed by a stable per-run identity.
#[derive(Default)]
struct ActiveForwards {
    next_id: u64,
    active: Vec<(u64, String, PortForward)>,
}

impl ActiveForwards {
    /// Holds `forward` while its Agent still has the Sandbox it dials. A
    /// forward that finished starting after its Agent was deleted or re-created
    /// is stopped at once, and `false` says so.
    fn push(&mut self, agent: String, forward: PortForward, agents: &[Agent]) -> bool {
        if !dials_current_sandbox(agents, &agent, &forward) {
            return false;
        }
        let id = self.next_id;
        self.next_id += 1;
        self.active.push((id, agent, forward));
        true
    }

    fn remove(&mut self, id: u64) {
        self.active.retain(|(entry, _, _)| *entry != id);
    }

    /// Stops forwards whose Sandbox their Agent no longer has: the Agent was
    /// deleted, or re-created under the same name with a Sandbox of its own.
    /// An Agent whose Sandbox is not materialized yet keeps its forwards.
    fn prune(&mut self, agents: &[Agent]) {
        self.active
            .retain(|(_, name, forward)| dials_current_sandbox(agents, name, forward));
    }

    /// The address that opens the Agent's forward to `viewer`, while it still serves.
    fn desktop(&self, agent: &str, viewer: DesktopViewer) -> Option<String> {
        self.active
            .iter()
            .map(|(_, name, forward)| (name, forward))
            .find(|(name, forward)| {
                *name == agent && forward.spec().guest_port == viewer.guest_port() && !forward.finished()
            })
            .map(|(_, forward)| crate::launch::forward_url(forward.local_address(), forward.spec().guest_port))
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
                finished: forward.finished(),
            })
            .collect()
    }
}

/// Follows every Agent and Session, sending each state the daemon reports.
///
/// Each reply is the complete current state, so a reply lost to a reconnect
/// needs no recovery: the next one supersedes it.
fn spawn_watch(socket_path: PathBuf, inputs: Inputs) {
    tokio::task::spawn_local(async move {
        let client = Client::for_path(socket_path);
        let mut after = None;
        loop {
            let reply = match client.watch(after, agent::resources::Selector::default()).await {
                Ok(resources) => {
                    after = Some(resources.revision);
                    Ok(resources)
                }
                // An upgraded daemon may no longer speak this client's protocol,
                // which explains the failure better than the failed call does.
                Err(error) => Err(client.require_compatible_daemon().await.err().unwrap_or(error)),
            };
            let failed = reply.is_err();
            if inputs
                .send(Input::Resources(reply.map_err(|error| error.to_string())))
                .is_err()
            {
                return;
            }
            if failed {
                tokio::time::sleep(RECONNECT_INTERVAL).await;
            }
        }
    });
}

/// The task following the provisioning an open detail shows, at most one.
#[derive(Default)]
struct Follow {
    task: Option<(String, tokio::task::JoinHandle<()>)>,
}

impl Follow {
    /// Follows `agent`, stopping the previous task when the agent changes.
    fn sync(&mut self, agent: Option<&str>, socket_path: PathBuf, inputs: &Inputs) {
        if self.task.as_ref().map(|(followed, _)| followed.as_str()) == agent {
            return;
        }
        if let Some((_, task)) = self.task.take() {
            task.abort();
        }
        self.task = agent.map(|agent| {
            (
                agent.to_owned(),
                spawn_follow(socket_path, agent.to_owned(), inputs.clone()),
            )
        });
    }
}

/// Follows one Agent's provisioning through `agents.v1.progress`, sending the
/// lines to show after every reply.
fn spawn_follow(socket_path: PathBuf, agent: String, inputs: Inputs) -> tokio::task::JoinHandle<()> {
    tokio::task::spawn_local(async move {
        let client = Client::for_path(socket_path);
        let mut followed = provisioning::Followed::default();
        loop {
            let (after, output) = followed.position();
            let lines = match client.agent_progress(&agent, after, output).await {
                Ok(progress) => {
                    followed.apply(progress);
                    followed.lines()
                }
                Err(error) => {
                    tokio::time::sleep(RECONNECT_INTERVAL).await;
                    vec![format!("Cannot follow provisioning: {error}")]
                }
            };
            let agent = agent.clone();
            if inputs.send(Input::Provisioning { agent, lines }).is_err() {
                return;
            }
        }
    })
}

/// Checks in the background how OpenSSH resolves `agent`'s alias.
fn spawn_ssh_check(inputs: Inputs, agent: String) {
    tokio::task::spawn_local(async move {
        let setup = SshSetup::check(&agent).await;
        let _ = inputs.send(Input::SshChecked { agent, setup });
    });
}

/// What `o` opens outside this terminal.
enum Outside {
    Editor {
        agent: String,
        editor: crate::launch::Editor,
        launcher: Option<PathBuf>,
    },
    /// The Agent's desktop, through a new forward.
    Desktop { agent: String, viewer: DesktopViewer },
    /// The address of a forward that is already open.
    Forward(String),
}

/// What a background open leaves for the event loop.
struct OpenOutcome {
    notice: String,
    /// A forward the open started, for the TUI to hold, with its Agent.
    forward: Option<(String, PortForward)>,
    /// An address to copy instead of opening, since this terminal cannot show windows.
    copy: Option<String>,
}

/// Opens `outside`, first waiting for its Agent to be Ready when it has one,
/// so an editor's first connection does not wait behind provisioning and time
/// out, and ends the wait for `waiting`. With `copy`, since nothing can open
/// here, an address is copied instead.
fn spawn_open(
    home: &ControlPlaneHome,
    inputs: Inputs,
    waiting: Option<(String, OpenTarget)>,
    outside: Outside,
    copy: bool,
) {
    let home_path = home.path().to_path_buf();
    let socket_path = home.socket_path();
    tokio::task::spawn_local(async move {
        let client = Client::for_path(socket_path);
        let outcome = within_deadline(async {
            let (launch, what, forward) = match outside {
                Outside::Editor {
                    agent,
                    editor,
                    launcher,
                } => {
                    client
                        .ensure_execution(&agent, Policy::UntilReady)
                        .await
                        .map_err(|error| error.to_string())?;
                    let access = client.ssh_access(&agent).await.map_err(|error| error.to_string())?;
                    let launch = editor
                        .launch(launcher.as_deref(), &access.alias, &access.working_directory)
                        .ok_or_else(|| {
                            format!("{}: {}", editor.label(), editor.missing_launcher().unwrap_or_default())
                        })?;
                    (launch, format!("{} on {agent}", editor.label()), None)
                }
                Outside::Desktop { agent, viewer } => {
                    let forward = desktop_forward(&client, home_path, &agent, viewer).await?;
                    let url = crate::launch::forward_url(forward.local_address(), forward.spec().guest_port);
                    (crate::launch::Launch::Url(url.clone()), url, Some((agent, forward)))
                }
                Outside::Forward(url) => (crate::launch::Launch::Url(url.clone()), url, None),
            };
            hand_over(launch, &what, forward, copy).await
        })
        .await
        .and_then(|outcome| outcome);
        let _ = inputs.send(Input::Opened { waiting, outcome });
    });
}

/// Launches what an open resolved to, or copies its address where nothing can
/// open here. Every address is a forward's, so when launching it fails the
/// forward is kept, since its address still works, and the address is copied.
async fn hand_over(
    launch: crate::launch::Launch,
    what: &str,
    forward: Option<(String, PortForward)>,
    copy: bool,
) -> Result<OpenOutcome, String> {
    let url = match &launch {
        crate::launch::Launch::Url(url) => Some(url.clone()),
        crate::launch::Launch::Command { .. } => None,
    };
    if let (Some(url), true) = (&url, copy) {
        return Ok(OpenOutcome {
            notice: format!("copied {url}, reachable from the machine running agentctl"),
            forward,
            copy: Some(url.clone()),
        });
    }
    launched(launch.start().await, what, url, forward)
}

/// How an open ends once its launch was tried.
fn launched(
    started: Result<(), String>,
    what: &str,
    url: Option<String>,
    forward: Option<(String, PortForward)>,
) -> Result<OpenOutcome, String> {
    match (started, url, forward) {
        (Ok(()), _, forward) => Ok(OpenOutcome {
            notice: format!("opening {what}"),
            forward,
            copy: None,
        }),
        (Err(error), Some(url), forward) => Ok(OpenOutcome {
            notice: format!("could not open {url}, so it is copied: {error}"),
            forward,
            copy: Some(url),
        }),
        (Err(error), _, _) => Err(format!("opening {what} failed: {error}")),
    }
}

/// Applies a finished background open: keeps a forward it started, copies an
/// address it left, and shows how it ended. A failed copy is shown like any
/// other failure, so the forwards the TUI holds stay open.
fn open_finished(
    app: &mut App,
    forwards: &mut ActiveForwards,
    waiting: Option<(String, OpenTarget)>,
    outcome: Result<OpenOutcome, String>,
) {
    let result = outcome.and_then(|opened| {
        if let Some((agent, forward)) = opened.forward
            && !forwards.push(agent.clone(), forward, &app.agents)
        {
            return Err(format!(
                "{agent} was deleted or re-created while it opened, so its address no longer works"
            ));
        }
        if let Some(url) = &opened.copy {
            terminal::copy_to_clipboard(url).map_err(|error| format!("could not copy {url}: {error}"))?;
        }
        Ok(opened.notice)
    });
    app.opened(waiting, result, Instant::now());
}

/// Forwards the Agent's desktop to a free local port once it is Ready. The
/// browser viewer's port is known only after a pass has seen what the image
/// declares, so it is read after converging.
async fn desktop_forward(
    client: &Client,
    home: PathBuf,
    agent: &str,
    viewer: DesktopViewer,
) -> Result<PortForward, String> {
    let target = client
        .ensure_execution(agent, Policy::UntilReady)
        .await
        .map_err(|error| error.to_string())?;
    let access = client.vnc_access(agent).await.map_err(|error| error.to_string())?;
    let guest_port = match viewer {
        DesktopViewer::Browser => access
            .web_guest_port
            .ok_or_else(|| format!("the image of {agent} serves no browser viewer; open it in a VNC client"))?,
        DesktopViewer::VncClient => access.guest_port,
    };
    let spec = ForwardSpec {
        address: std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST),
        local_port: 0,
        guest_port,
    };
    PortForward::start(home, target.sandbox, spec)
        .await
        .map_err(|error| error.to_string())
}

/// Loads the most recent turns of the selected Session.
fn spawn_transcript(socket_path: PathBuf, inputs: Inputs, agent: String, session: SessionName) {
    tokio::task::spawn_local(async move {
        let turns = Client::for_path(socket_path)
            .session_turns(&agent, session.clone(), Some(TRANSCRIPT_TURNS))
            .await
            .map_err(|error| error.to_string());
        let _ = inputs.send(Input::TranscriptLoaded { agent, session, turns });
    });
}

/// Sends a prompt to a running Session without waiting for its turn to start.
fn spawn_prompt(socket_path: PathBuf, inputs: Inputs, form: PromptForm) {
    tokio::task::spawn_local(async move {
        let result = Client::for_path(socket_path)
            .prompt_session(&form.agent, form.session.clone(), form.input.clone(), false, None)
            .await
            .map_err(|error| error.to_string());
        let _ = inputs.send(Input::PromptSent(form, result));
    });
}

/// Deletes a Session off the event loop: the call returns only once its harness
/// is stopped, and the watch removes the row.
fn spawn_session_delete(socket_path: PathBuf, inputs: Inputs, agent: String, session: SessionName) {
    tokio::task::spawn_local(async move {
        let client = Client::for_path(socket_path);
        let deleted = within_deadline(client.delete_session(&agent, session)).await;
        if let Err(error) = deleted.and_then(|deleted| deleted.map_err(|error| error.to_string())) {
            let _ = inputs.send(Input::SessionChangeFailed(error));
        }
    });
}

/// Archives or unarchives a Session off the event loop, which stopping its harness would block.
fn spawn_session_archive(socket_path: PathBuf, inputs: Inputs, agent: String, session: SessionName, archived: bool) {
    tokio::task::spawn_local(async move {
        let client = Client::for_path(socket_path);
        let changed = within_deadline(client.set_session_archived(&agent, session, archived)).await;
        let _ = inputs.send(
            match changed.and_then(|changed| changed.map_err(|error| error.to_string())) {
                Ok(session) => Input::ArchiveChanged(session),
                Err(error) => Input::SessionChangeFailed(error),
            },
        );
    });
}

/// Creates a forward off the event loop so provisioning never freezes the UI.
fn spawn_create(home: &ControlPlaneHome, inputs: Inputs, agent: String, spec: ForwardSpec, replace: Option<u64>) {
    let home_path = home.path().to_path_buf();
    let socket_path = home.socket_path();
    tokio::task::spawn_local(async move {
        let client = Client::for_path(socket_path);
        let result = within_deadline(async {
            // The TUI has no place to render progress while on screen, so a failing
            // first pass is reported instead of waited through.
            let target = client.ensure_execution(&agent, Policy::FirstPass).await?;
            PortForward::start(home_path, target.sandbox, spec.clone()).await
        })
        .await
        .unwrap_or_else(|timed_out| Err(Error::Daemon(timed_out)));
        let _ = inputs.send(Input::ForwardCreated((agent, spec, replace, result)));
    });
}

/// Bounds a background request by [`BACKGROUND_WAIT`].
async fn within_deadline<T>(request: impl Future<Output = T>) -> Result<T, String> {
    tokio::time::timeout(BACKGROUND_WAIT, request).await.map_err(|_| {
        format!(
            "stopped waiting after {}m; agentd keeps working on the request",
            BACKGROUND_WAIT.as_secs() / 60
        )
    })
}

/// Discovers create-agent candidates off the event loop so a slow filesystem never freezes the UI.
fn spawn_discovery(inputs: Inputs, agents: Vec<Agent>) {
    tokio::task::spawn_local(async move {
        let candidates = manifest_candidates(std::env::current_dir().ok(), &agents).await;
        let _ = inputs.send(Input::ManifestsDiscovered(candidates));
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
) {
    match create_agent(client, manifest, name, env_file).await {
        Ok(applied) => app.agent_applied(applied),
        Err(error) => {
            form.error = Some(error.to_string());
            app.modal = Some(Modal::CreateAgent(form));
        }
    }
}

async fn create_agent(
    client: &Client,
    manifest: PathBuf,
    name: String,
    env_file: Option<PathBuf>,
) -> Result<Agent, Error> {
    let mut request = crate::read_apply_request(manifest, env_file)?;
    request.agent.metadata.name = name;
    request.create_only = true;
    client.apply(request).await
}

/// Applies one completed background forward creation to the UI state.
fn forward_created(app: &mut App, forwards: &mut ActiveForwards, outcome: CreateOutcome) {
    let (agent, spec, replace, result) = outcome;
    app.creating = app.creating.saturating_sub(1);
    match result {
        Ok(forward) => {
            if !forwards.push(agent.clone(), forward, &app.agents) {
                app.error = Some(format!("{agent} was deleted or re-created before its forward started"));
            }
        }
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
        Action::Exec { agent }
        | Action::Open {
            agent,
            target: OpenTarget::Shell,
        } => exec(home, client, &agent).await,
        Action::Open {
            agent,
            target: OpenTarget::SshShell,
        } => ssh_shell(client, &agent).await,
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
        .until(client, agent, client.ensure_session(agent, session, request))
        .await?;
    agent::sessions::attach(home.path(), &target).await
}

async fn exec(home: &ControlPlaneHome, client: &Client, agent: &str) -> Result<(), Error> {
    let wait = Wait::start();
    let target = wait
        .until(client, agent, client.ensure_execution(agent, Policy::UntilReady))
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

/// Runs OpenSSH against the Agent's generated alias until it exits.
///
/// Unlike `agentctl ssh`, this waits for the client rather than replacing the
/// process, which is the TUI's.
async fn ssh_shell(client: &Client, agent: &str) -> Result<(), Error> {
    let wait = Wait::start();
    wait.until(client, agent, client.ensure_execution(agent, Policy::UntilReady))
        .await?;
    let access = client.ssh_access(agent).await?;
    // Awaited, not waited on: the TUI's forwards and watch share this thread.
    let status = tokio::process::Command::new(crate::ssh_client_executable())
        .args(crate::ssh_client_arguments(&access))
        .status()
        .await
        .map_err(|error| Error::Invalid(crate::ssh_client_failure(&error)))?;
    // 255 is OpenSSH's own failure; any other status is the remote shell's last command.
    if status.code() == Some(255) {
        // Returning to the TUI clears the screen, and with it what ssh printed about why.
        eprint!(
            "\nssh to {} ended with an OpenSSH error. Press Enter to return to agentctl. ",
            access.alias
        );
        let mut line = String::new();
        let _ =
            tokio::io::AsyncBufReadExt::read_line(&mut tokio::io::BufReader::new(tokio::io::stdin()), &mut line).await;
        return Err(Error::Invalid(format!(
            "ssh to {} ended with an OpenSSH error",
            access.alias
        )));
    }
    Ok(())
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

    #[test]
    fn row_primary_actions_require_two_clicks_on_the_same_row_in_time() {
        let mut mouse = MouseInput::default();
        let start = Instant::now();
        let row = |name: &str| RowTarget::Tree(app::TreeRowId::Agent(name.into()));

        assert!(!mouse.double_click(&row("first"), start));
        assert!(!mouse.double_click(&row("second"), start + Duration::from_millis(100)));
        assert!(!mouse.double_click(&row("second"), start + Duration::from_millis(700)));
        assert!(mouse.double_click(&row("second"), start + Duration::from_millis(800)));
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
        // More lines than the view shows, so there is something to scroll.
        app.detail = Some(app::Detail::text(
            "detail".into(),
            (1..=12).map(|line| format!("line {line}")).collect(),
        ));
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
        assert_eq!(app.detail.as_ref().map(|detail| detail.scroll), Some(1));
        assert_eq!(mouse.action(wheel(0, 1), &hit_map, &mut app, now), Action::None);
        assert_eq!(app.detail.as_ref().map(|detail| detail.scroll), Some(1));
    }

    fn materialized(id: &str) -> agent::sandbox::Assignment {
        serde_json::from_value(serde_json::json!({
            "state": "materialized",
            "provider": "memory",
            "id": id,
        }))
        .expect("test assignment")
    }

    async fn forward(assignment: &agent::sandbox::Assignment, guest_port: u16) -> PortForward {
        let spec = ForwardSpec::parse(&format!("127.0.0.1:0:{guest_port}")).expect("spec");
        let home = tempfile::tempdir().expect("home");
        PortForward::start(home.path().to_path_buf(), assignment.clone(), spec)
            .await
            .expect("forward binds")
    }

    #[tokio::test(flavor = "local")]
    async fn a_failed_launch_keeps_the_forward_and_copies_its_address() {
        let sandbox = materialized("00000000-0000-0000-0000-00000000000a");
        let url = "http://127.0.0.1:50001/".to_owned();
        let failed = || Err("no opener".to_owned());

        let kept = launched(
            failed(),
            &url,
            Some(url.clone()),
            Some(("desk".into(), forward(&sandbox, 6080).await)),
        )
        .expect("the forward still works");
        assert_eq!(kept.notice, format!("could not open {url}, so it is copied: no opener"));
        assert_eq!(kept.copy.as_deref(), Some(url.as_str()));
        assert!(kept.forward.is_some());

        let reopened = launched(failed(), &url, Some(url.clone()), None).expect("the open forward still works");
        assert_eq!(
            reopened.copy.as_deref(),
            Some(url.as_str()),
            "an open forward is copied too"
        );

        assert_eq!(
            launched(failed(), "Zed on desk", None, None).err().as_deref(),
            Some("opening Zed on desk failed: no opener")
        );
        let opened = launched(Ok(()), "Zed on desk", None, None).expect("opened");
        assert_eq!(opened.notice, "opening Zed on desk");
        assert!(opened.copy.is_none());
    }

    #[tokio::test(flavor = "local")]
    async fn a_blocked_launch_copies_the_address_and_keeps_the_forward() {
        let sandbox = materialized("00000000-0000-0000-0000-00000000000a");
        let url = "http://127.0.0.1:50001/".to_owned();
        let copied = hand_over(
            crate::launch::Launch::Url(url.clone()),
            &url,
            Some(("desk".into(), forward(&sandbox, 6080).await)),
            true,
        )
        .await
        .expect("copied");
        assert_eq!(
            copied.notice,
            format!("copied {url}, reachable from the machine running agentctl")
        );
        assert_eq!(copied.copy.as_deref(), Some(url.as_str()));
        assert!(copied.forward.is_some());
    }

    #[tokio::test(flavor = "local")]
    async fn forwards_end_with_the_sandbox_they_dial() {
        let first = materialized("00000000-0000-0000-0000-00000000000a");
        let second = materialized("00000000-0000-0000-0000-00000000000b");
        let mut forwards = ActiveForwards::default();
        let mut desk = recorded_agent("desk", None);
        desk.status.sandbox = Some(first.clone());
        assert!(forwards.push(
            "desk".into(),
            forward(&first, agent::vnc::WEB_GUEST_PORT).await,
            std::slice::from_ref(&desk)
        ));

        forwards.prune(std::slice::from_ref(&desk));
        assert!(
            forwards.desktop("desk", DesktopViewer::Browser).is_some(),
            "same Sandbox"
        );
        assert!(
            forwards.desktop("desk", DesktopViewer::VncClient).is_none(),
            "another viewer"
        );

        desk.status.sandbox = None;
        forwards.prune(std::slice::from_ref(&desk));
        assert_eq!(
            forwards.entries().len(),
            1,
            "no Sandbox reported yet, so nothing says it is gone"
        );

        desk.status.sandbox = Some(second.clone());
        forwards.prune(std::slice::from_ref(&desk));
        assert!(
            forwards.entries().is_empty(),
            "re-created under the same name, so the old forward is dead"
        );

        assert!(forwards.push("desk".into(), forward(&second, 3000).await, std::slice::from_ref(&desk)));
        forwards.prune(&[]);
        assert!(forwards.entries().is_empty(), "the Agent is gone");
    }

    #[tokio::test(flavor = "local")]
    async fn a_forward_that_starts_after_its_agent_was_re_created_is_not_kept() {
        let first = materialized("00000000-0000-0000-0000-00000000000a");
        let mut desk = recorded_agent("desk", None);
        desk.status.sandbox = Some(materialized("00000000-0000-0000-0000-00000000000b"));
        let mut app = App::new();
        app.agents = vec![desk];
        let mut forwards = ActiveForwards::default();
        let target = OpenTarget::Desktop(DesktopViewer::Browser);
        app.start_opening("desk", target, Instant::now());

        let opened = OpenOutcome {
            notice: "opening the desktop".into(),
            forward: Some(("desk".into(), forward(&first, agent::vnc::WEB_GUEST_PORT).await)),
            copy: None,
        };
        open_finished(&mut app, &mut forwards, Some(("desk".into(), target)), Ok(opened));

        assert!(forwards.entries().is_empty());
        assert_eq!(
            app.error.as_deref(),
            Some("desk was deleted or re-created while it opened, so its address no longer works")
        );
        assert!(app.opening.is_empty(), "the wait ends");

        let spec = ForwardSpec::parse("127.0.0.1:0:3000").expect("spec");
        app.error = None;
        app.creating = 1;
        let started = forward(&first, 3000).await;
        forward_created(&mut app, &mut forwards, ("desk".into(), spec, None, Ok(started)));
        assert!(forwards.entries().is_empty());
        assert_eq!(
            app.error.as_deref(),
            Some("desk was deleted or re-created before its forward started")
        );
    }

    #[tokio::test(flavor = "local")]
    async fn an_edited_desktop_forward_is_still_the_desktop() {
        let assignment = materialized("00000000-0000-0000-0000-00000000000a");
        let mut forwards = ActiveForwards::default();
        let desk = recorded_agent("desk", None);
        forwards.push(
            "desk".into(),
            forward(&assignment, agent::vnc::WEB_GUEST_PORT).await,
            std::slice::from_ref(&desk),
        );
        let id = forwards.entries()[0].id;
        forwards.remove(id);
        let mut app = App::new();
        app.agents = vec![desk];
        app.creating = 1;
        let spec = ForwardSpec::parse("127.0.0.1:0:6080").expect("spec");
        let edited = forward(&assignment, agent::vnc::WEB_GUEST_PORT).await;

        forward_created(&mut app, &mut forwards, ("desk".into(), spec, Some(id), Ok(edited)));

        assert_eq!(forwards.entries()[0].label(), Some("desktop"));
        assert!(
            forwards.desktop("desk", DesktopViewer::Browser).is_some(),
            "o w finds it again"
        );
    }
}
