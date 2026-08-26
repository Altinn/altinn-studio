mod app;
mod terminal;
mod view;

use std::{io::IsTerminal as _, process::ExitCode, time::Duration};

use agent::{
    Agent, Error, Harness, control_api::Client, local::home::ControlPlaneHome, sessions::Session, sessions::SessionName,
};
use crossterm::event::{Event, EventStream, KeyCode, KeyEventKind, KeyModifiers};
use futures_util::StreamExt as _;
use sandbox::terminal::TerminalAttachOutcome;

use crate::CommandResult;
use app::{Action, App};
use terminal::Tui;

const REFRESH_INTERVAL: Duration = Duration::from_secs(2);

enum Input {
    Event(Option<std::io::Result<Event>>),
    Tick,
}

pub(crate) async fn run(home: &ControlPlaneHome, client: &Client) -> CommandResult<ExitCode> {
    if !std::io::stdin().is_terminal() || !std::io::stdout().is_terminal() {
        return Err(Error::Invalid("tui requires an interactive local terminal".into()).into());
    }
    let mut app = App::new();
    let mut tui = Tui::enter()?;
    let mut events = EventStream::new();
    let mut tick = tokio::time::interval_at(tokio::time::Instant::now() + REFRESH_INTERVAL, REFRESH_INTERVAL);
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    refresh(&mut app, &mut tui, client).await?;
    loop {
        tui.draw(&app)?;
        let input = tokio::select! {
            event = events.next() => Input::Event(event),
            _ = tick.tick() => Input::Tick,
        };
        match input {
            Input::Tick => {
                if app.idle() {
                    refresh(&mut app, &mut tui, client).await?;
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
