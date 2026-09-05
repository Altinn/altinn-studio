mod app;
mod terminal;
mod view;

use std::{io::IsTerminal as _, process::ExitCode, time::Duration};

use agent::{Agent, Error, control_api::Client, sandbox::PortForwardSpec, sessions::Session};
use crossterm::event::{Event, EventStream, KeyCode, KeyEventKind, KeyModifiers};
use futures_util::StreamExt as _;
use sandbox::terminal::TerminalAttachOutcome;

use crate::CommandResult;
use crate::forward::PortForward;
use app::{Action, App, ForwardEntry, ForwardForm, Modal};
use terminal::Tui;

const REFRESH_INTERVAL: Duration = Duration::from_secs(2);

enum Input {
    Event(Option<std::io::Result<Event>>),
    Tick,
    ForwardCreated(CreateOutcome),
}

/// Completion of one background forward creation.
type CreateOutcome = (String, PortForwardSpec, Option<u64>, Result<PortForward, Error>);

pub(crate) async fn run(client: &Client) -> CommandResult<ExitCode> {
    if !std::io::stdin().is_terminal() || !std::io::stdout().is_terminal() {
        return Err(Error::Invalid("tui requires an interactive local terminal".into()).into());
    }
    let mut app = App::new();
    let mut forwards = ActiveForwards::default();
    let (created_tx, mut created_rx) = tokio::sync::mpsc::unbounded_channel::<CreateOutcome>();
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
        };
        match input {
            Input::Tick => {
                if app.idle() {
                    refresh(&mut app, &mut tui, client).await?;
                }
            }
            Input::ForwardCreated((agent, spec, replace, result)) => {
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
                    Action::CreateForward { agent, spec, replace } => {
                        if let Some(id) = replace {
                            forwards.remove(id);
                        }
                        app.creating += 1;
                        spawn_create(client, created_tx.clone(), agent, spec, replace);
                    }
                    Action::DeleteForward { id } => forwards.remove(id),
                    action => {
                        drop(events);
                        suspended(&mut app, &mut tui, client, action).await?;
                        events = EventStream::new();
                        refresh(&mut app, &mut tui, client).await?;
                    }
                }
            }
            Input::Event(Some(Ok(_))) => {}
        }
    }
}

/// UI-owned port-forward handles keyed by a stable per-run identity.
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
                guest_port: forward.spec().guest_port(),
                status: forward.status(),
            })
            .collect()
    }
}

/// Creates a forward off the event loop so provisioning never freezes the UI.
fn spawn_create(
    client: &Client,
    outcomes: tokio::sync::mpsc::UnboundedSender<CreateOutcome>,
    agent: String,
    spec: PortForwardSpec,
    replace: Option<u64>,
) {
    let client = client.clone();
    tokio::task::spawn_local(async move {
        let result = PortForward::start(&client, &agent, spec.clone()).await;
        let _ = outcomes.send((agent, spec, replace, result));
    });
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

async fn suspended(app: &mut App, tui: &mut Tui, client: &Client, action: Action) -> CommandResult<()> {
    tui.suspend()?;
    let result = match action {
        Action::Attach { agent, session } => crate::terminal::attach_session(client, &agent, session, None).await,
        Action::CreateSession {
            agent,
            session,
            harness,
        } => crate::terminal::attach_session(client, &agent, session, Some(harness)).await,
        Action::Exec { agent } => exec(client, &agent).await,
        _ => Ok(()),
    };
    tui.resume()?;
    if let Err(error) = result {
        app.error = Some(error.to_string());
    }
    Ok(())
}

async fn exec(client: &Client, agent: &str) -> Result<(), Error> {
    eprintln!("Ensuring Agent {agent:?}; initial provisioning can take several minutes...");
    let command = vec!["bash".to_owned(), "-l".to_owned()];
    let initial_size = crate::terminal::current_size()?;
    let terminal = client.start_terminal_execution(agent, command, initial_size).await?;
    match crate::terminal::run(terminal).await? {
        TerminalAttachOutcome::Exited(_) | TerminalAttachOutcome::Detached => Ok(()),
        _ => Err(Error::Session(
            "terminal execution returned an unsupported outcome".into(),
        )),
    }
}
