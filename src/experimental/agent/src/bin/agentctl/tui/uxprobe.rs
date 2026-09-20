//! Golden-frame fixture and inspection helpers for the TUI.

use agent::{Condition, ConditionStatus, sessions::Session};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use ratatui::{Terminal, backend::TestBackend, style::Color};

use super::{
    app::{App, CreateForm, ForwardEntry, ManifestCandidate, Modal},
    view::{ViewState, render},
};

struct FrameDump {
    text: String,
    colors: Vec<Vec<Color>>,
}

fn render_dump(app: &App, width: u16, height: u16) -> FrameDump {
    let mut state = ViewState::default();
    let mut terminal = Terminal::new(TestBackend::new(width, height)).expect("test terminal");
    terminal
        .draw(|frame| {
            render(frame, app, &mut state);
        })
        .expect("test draw");
    let buffer = terminal.backend().buffer();
    let area = buffer.area();
    let mut text = String::new();
    let mut colors = Vec::new();
    for y in area.top()..area.bottom() {
        let mut row = String::new();
        let mut row_colors = Vec::new();
        for x in area.left()..area.right() {
            let cell = &buffer[(x, y)];
            row.push_str(cell.symbol());
            row_colors.push(cell.fg);
        }
        text.push_str(row.trim_end());
        text.push('\n');
        colors.push(row_colors);
    }
    FrameDump { text, colors }
}

fn agent(name: &str, reason: &str, status: ConditionStatus, message: &str) -> agent::Agent {
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
         \x20   - type: claudeCode\n\
         \x20     version: \"1.0.0\"\n\
         \x20     auth: mediated\n\
         \x20     default: true\n\
         \x20     defaults:\n\
         \x20       model: fable\n\
         \x20   - type: codex\n\
         \x20     version: \"1.0.0\"\n\
         \x20     auth: mediated\n\
         \x20 secrets: []\n\
         \x20 network:\n\
         \x20   mode: mediated\n\
         \x20   allow: all\n"
    );
    let mut agent = agent::manifest::decode(yaml.as_bytes()).expect("fleet Agent manifest");
    agent.status.conditions.push(Condition {
        kind: Condition::READY.into(),
        status,
        reason: reason.into(),
        message: message.into(),
    });
    agent
}

fn session(index: u128, agent: &str, name: &str, state: &str, harness: &str, model: Option<&str>) -> Session {
    let lifecycle = match state {
        "working" | "waitingForInput" => "running",
        other => other,
    };
    let model_selection = model.map_or_else(|| serde_json::json!({}), |model| serde_json::json!({"model": model}));
    serde_json::from_value(serde_json::json!({
        "id": format!("00000000-0000-0000-0000-{index:012x}"),
        "agentId": "00000000-0000-0000-0000-000000000100",
        "agent": agent,
        "name": name,
        "harness": harness,
        "modelSelection": model_selection,
        "createdAt": "2026-09-19T00:00:00Z",
        "status": {
            "state": state,
            "lifecycle": {"state": lifecycle},
            "reported": {
                "harnessSessionId": "fixture-conversation",
                "activity": {
                    "phase": if state == "waitingForInput" { "waitingForInput" } else { "working" },
                    "lastEventAt": "2026-09-20T08:00:00Z"
                }
            }
        }
    }))
    .expect("fleet Session")
}

fn fleet() -> App {
    let mut app = App::new();
    app.apply_snapshot(
        vec![
            agent(
                "altinn-studio",
                "SandboxReady",
                ConditionStatus::True,
                "Sandbox is ready",
            ),
            agent(
                "designer-spike",
                "ProviderSelected",
                ConditionStatus::False,
                "Preparing image layers",
            ),
            agent(
                "self-dev",
                "SandboxReconcileFailed",
                ConditionStatus::False,
                "image build failed",
            ),
            agent(
                "worktree-a11y",
                "SandboxReady",
                ConditionStatus::True,
                "Sandbox is ready",
            ),
        ],
        vec![
            session(1, "altinn-studio", "flaky-test-hunt", "idle", "codex", None),
            session(2, "altinn-studio", "main", "working", "claudeCode", Some("fable")),
            session(
                3,
                "altinn-studio",
                "review-pr-20531",
                "waitingForInput",
                "claudeCode",
                Some("fable"),
            ),
            session(4, "self-dev", "changelog", "failed", "claudeCode", None),
            session(5, "self-dev", "tui-ux", "waitingForInput", "claudeCode", Some("fable")),
            session(
                6,
                "worktree-a11y",
                "aria-labels",
                "waitingForInput",
                "claudeCode",
                Some("fable"),
            ),
            session(7, "worktree-a11y", "axe-sweep", "working", "codex", Some("gpt-5-codex")),
            session(8, "worktree-a11y", "contrast", "starting", "claudeCode", Some("fable")),
        ],
    );
    app.set_forwards(vec![ForwardEntry {
        id: 1,
        agent: "altinn-studio".into(),
        local: "127.0.0.1:3000".into(),
        guest_port: 3000,
        status: None,
    }]);
    app
}

fn key(character: char) -> KeyEvent {
    KeyEvent::new(KeyCode::Char(character), KeyModifiers::NONE)
}

#[test]
fn fleet_fixture_renders_at_review_widths_with_cell_styles() {
    let app = fleet();
    for (width, height) in [(60, 14), (80, 24), (110, 30)] {
        let dump = render_dump(&app, width, height);
        assert_eq!(dump.colors.len(), usize::from(height));
        assert!(dump.colors.iter().all(|row| row.len() == usize::from(width)));
        assert!(dump.text.contains("agentctl"));
        assert!(dump.text.contains("altinn-studio"));
        assert!(dump.text.contains("Needs you"));
        assert!(dump.text.contains(" j/k  move"));
    }
}

#[test]
fn fixture_covers_every_modal_with_the_real_renderer() {
    let mut app = fleet();
    app.on_key(key('n'));
    assert!(render_dump(&app, 110, 30).text.contains("new session"));

    app.modal = None;
    app.on_key(key('f'));
    assert!(render_dump(&app, 110, 30).text.contains("port forward"));

    app.modal = Some(Modal::ConfirmDelete {
        agent: "altinn-studio".into(),
        sessions: 3,
    });
    assert!(render_dump(&app, 110, 30).text.contains("Delete agent altinn-studio?"));

    app.modal = Some(Modal::CreateAgent(CreateForm::new(
        vec![ManifestCandidate::new(
            "/workspace/agent.yaml".into(),
            Ok("altinn-studio".into()),
        )],
        None,
    )));
    assert!(render_dump(&app, 110, 30).text.contains("create agent"));

    app.modal = None;
    app.select_index(1);
    app.on_key(key('p'));
    assert!(render_dump(&app, 110, 30).text.contains("prompt"));
}
