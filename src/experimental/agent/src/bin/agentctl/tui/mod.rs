mod app;
mod terminal;
mod view;

use std::{collections::HashSet, io::IsTerminal as _, path::PathBuf, process::ExitCode, time::Duration};

use agent::{
    Agent, Error, Harness, control_api::Client, local::home::ControlPlaneHome, manifest, sessions::Session,
    sessions::SessionName,
};
use crossterm::event::{Event, EventStream, KeyCode, KeyEventKind, KeyModifiers};
use futures_util::StreamExt as _;
use sandbox::terminal::TerminalAttachOutcome;

use crate::CommandResult;
use crate::forward::{ForwardSpec, PortForward};
use agent::manifest::MANIFEST_FILE;
use app::{Action, App, CreateForm, ForwardEntry, ForwardForm, ManifestCandidate, Modal};
use terminal::Tui;

const REFRESH_INTERVAL: Duration = Duration::from_secs(2);

enum Input {
    Event(Option<std::io::Result<Event>>),
    Tick,
    ForwardCreated(CreateOutcome),
    ManifestsDiscovered(Vec<ManifestCandidate>),
}

/// Completion of one background forward creation.
type CreateOutcome = (String, ForwardSpec, Option<u64>, Result<PortForward, Error>);

pub(crate) async fn run(home: &ControlPlaneHome, client: &Client) -> CommandResult<ExitCode> {
    if !std::io::stdin().is_terminal() || !std::io::stdout().is_terminal() {
        return Err(Error::Invalid("tui requires an interactive local terminal".into()).into());
    }
    let mut app = App::new();
    let mut forwards = ActiveForwards::default();
    let (created_tx, mut created_rx) = tokio::sync::mpsc::unbounded_channel::<CreateOutcome>();
    let (discovered_tx, mut discovered_rx) = tokio::sync::mpsc::unbounded_channel::<Vec<ManifestCandidate>>();
    let mut tui = Tui::enter()?;
    let mut events = EventStream::new();
    let mut tick = tokio::time::interval_at(tokio::time::Instant::now() + REFRESH_INTERVAL, REFRESH_INTERVAL);
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    refresh(&mut app, &mut tui, client).await?;
    loop {
        app.set_forwards(forwards.entries());
        tui.draw(&app)?;
        let input = tokio::select! {
            event = events.next() => Input::Event(event),
            _ = tick.tick() => Input::Tick,
            Some(outcome) = created_rx.recv() => Input::ForwardCreated(outcome),
            Some(candidates) = discovered_rx.recv() => Input::ManifestsDiscovered(candidates),
        };
        match input {
            Input::Tick => {
                if app.idle() {
                    refresh(&mut app, &mut tui, client).await?;
                }
            }
            Input::ForwardCreated(outcome) => forward_created(&mut app, &mut forwards, outcome),
            Input::ManifestsDiscovered(candidates) => {
                if std::mem::take(&mut app.discovering) && app.idle() {
                    app.open_create(candidates);
                }
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
                if key.code == KeyCode::Char('c') && key.modifiers.contains(KeyModifiers::CONTROL) {
                    tui.restore()?;
                    return Ok(ExitCode::SUCCESS);
                }
                match app.on_key(key) {
                    Action::None => {}
                    Action::Quit => {
                        tui.restore()?;
                        return Ok(ExitCode::SUCCESS);
                    }
                    Action::Refresh => refresh(&mut app, &mut tui, client).await?,
                    Action::Delete { agent } => {
                        if let Err(error) = client.delete(&agent).await {
                            app.error = Some(error.to_string());
                        }
                        refresh(&mut app, &mut tui, client).await?;
                    }
                    Action::OpenCreate => {
                        if !app.discovering {
                            app.discovering = true;
                            spawn_discovery(discovered_tx.clone(), app.agents.clone());
                        }
                    }
                    Action::CreateAgent { manifest, name, form } => {
                        create(&mut app, &mut tui, client, manifest, name, form).await?;
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
                        refresh(&mut app, &mut tui, client).await?;
                    }
                }
            }
            Input::Event(Some(Ok(_))) => {}
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
            let target = client.ensure_execution(&agent).await?;
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

/// Assembles create-agent candidates from the working directory and recorded Agent manifests.
///
/// The working directory is offered only when it holds a manifest; a recorded
/// manifest that is unreadable stays listed so its error is visible.
async fn manifest_candidates(current_directory: Option<PathBuf>, agents: &[Agent]) -> Vec<ManifestCandidate> {
    let mut recorded: Vec<PathBuf> = agents
        .iter()
        .filter_map(|agent| agent.status.provenance.as_ref())
        .map(agent::Provenance::manifest_or_default)
        .collect();
    recorded.sort();
    recorded.dedup();
    let paths = current_directory
        .into_iter()
        .map(|directory| (directory.join(MANIFEST_FILE), false))
        .chain(recorded.into_iter().map(|path| (path, true)));
    let mut seen = HashSet::new();
    let mut candidates = Vec::new();
    for (path, recorded) in paths {
        let name = match tokio::fs::read(&path).await {
            Ok(bytes) => manifest::decode(&bytes)
                .map(|decoded| decoded.metadata.name)
                .map_err(|error| error.to_string()),
            Err(_) if !recorded => continue,
            Err(error) => Err(error.to_string()),
        };
        let canonical = tokio::fs::canonicalize(&path).await.unwrap_or_else(|_| path.clone());
        if !seen.insert(canonical) {
            continue;
        }
        candidates.push(ManifestCandidate { path, name });
    }
    candidates
}

/// Applies the manifest under the chosen name; a rejection reopens the form with the error.
async fn create(
    app: &mut App,
    tui: &mut Tui,
    client: &Client,
    manifest: PathBuf,
    name: String,
    mut form: CreateForm,
) -> CommandResult<()> {
    match create_agent(client, manifest, name).await {
        Ok(applied) => {
            refresh(app, tui, client).await?;
            app.select_agent(&applied);
        }
        Err(error) => {
            form.error = Some(error.to_string());
            app.modal = Some(Modal::CreateAgent(form));
        }
    }
    Ok(())
}

async fn create_agent(client: &Client, manifest: PathBuf, name: String) -> Result<String, Error> {
    let mut request = crate::read_apply_request(manifest).await?;
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

async fn refresh(app: &mut App, tui: &mut Tui, client: &Client) -> CommandResult<()> {
    app.loading = true;
    tui.draw(app)?;
    let result = fetch(client).await;
    app.loading = false;
    match result {
        Ok((agents, sessions)) => {
            app.error = None;
            app.apply_snapshot(agents, sessions);
        }
        Err(error) => app.error = Some(error.to_string()),
    }
    Ok(())
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
        Action::Attach { agent, session } => attach(home, client, &agent, session, None).await,
        Action::CreateSession {
            agent,
            session,
            harness,
        } => attach(home, client, &agent, session, Some(harness)).await,
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
    harness: Option<Harness>,
) -> Result<(), Error> {
    eprintln!(
        "Ensuring Agent {agent:?} and Session {name:?}; initial provisioning can take several minutes...",
        name = session.as_str()
    );
    let target = client.ensure_session(agent, session, harness).await?;
    agent::sessions::attach(home.path(), &target).await
}

async fn exec(home: &ControlPlaneHome, client: &Client, agent: &str) -> Result<(), Error> {
    eprintln!("Ensuring Agent {agent:?}; initial provisioning can take several minutes...");
    let target = client.ensure_execution(agent).await?;
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
}
