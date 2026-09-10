#![allow(clippy::expect_used)]

mod support;

use std::{path::PathBuf, rc::Rc, time::Duration};

use agent::{
    AgentId, Condition, ConditionStatus, Status,
    control_plane::{AgentRecord, AgentStore as _},
    persistence,
    sandbox::{Assignment as SandboxAssignment, ProviderId},
    sessions::{LaunchRecord, SessionName, SessionStore as _},
};
use tempfile::TempDir;
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

fn ready_record(name: &str, id: AgentId) -> AgentRecord {
    let mut resource = support::agent(name);
    resource.metadata.generation = 1;
    resource.status = Status::observed(
        1,
        Some(SandboxAssignment::Materialized {
            provider: ProviderId::new("memory").expect("Provider ID"),
            id: "3f978c33-4d43-4ea4-b58d-10b90ef166af".parse().expect("Sandbox ID"),
        }),
        vec![Condition {
            kind: "Ready".into(),
            status: ConditionStatus::True,
            reason: "SandboxReady".into(),
            message: String::new(),
        }],
    );
    AgentRecord {
        id,
        source_directory: PathBuf::from("/source"),
        manifest_path: None,
        env_file: None,
        agent: resource,
    }
}

async fn request_to(port: u16, path: &str, token: &str, body: &str) -> u16 {
    let mut stream = tokio::net::TcpStream::connect(("127.0.0.1", port))
        .await
        .expect("connect to Platform API endpoint");
    let request = format!(
        "POST {path} HTTP/1.1\r\nhost: h\r\nauthorization: Bearer {token}\r\n\
         content-type: application/json\r\ncontent-length: {}\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(request.as_bytes()).await.expect("send request");
    let mut response = String::new();
    stream.read_to_string(&mut response).await.expect("read response");
    response
        .split(' ')
        .nth(1)
        .and_then(|status| status.parse().ok())
        .expect("response status")
}

async fn request(port: u16, token: &str, body: &str) -> u16 {
    request_to(port, "/v1/session/hooks", token, body).await
}

#[tokio::test(flavor = "local")]
#[allow(clippy::too_many_lines)]
async fn session_reports_require_the_current_launch_token() {
    const TOKEN_1: &str = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const TOKEN_2: &str = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    let directory = TempDir::new().expect("temporary directory");
    let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
    let agent_id = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    database.put(ready_record("worker", agent_id), 0).await.expect("Agent");
    let session = database
        .ensure_session(
            "worker",
            &SessionName::new("s1").expect("name"),
            agent::Harness::ClaudeCode,
            None,
        )
        .await
        .expect("session");
    database
        .record_session_launch(
            session.id,
            LaunchRecord {
                token: TOKEN_1.parse().expect("launch token"),
                sandbox: "sandbox-1".into(),
                launched_at: 0,
                attempts: 1,
            },
        )
        .await
        .expect("record launch");

    let listener = agent::platform_api::bind_persistent(&directory.path().join("platform-api-port"))
        .await
        .expect("bind Platform API listener");
    let port = listener.local_addr().expect("local address").port();
    let observers = agent::sessions::SessionObservers::new();
    let reported_errors = Rc::new(std::cell::Cell::new(0));
    let error_count = reported_errors.clone();
    let server = Rc::new(agent::platform_api::Server::new(
        Rc::new(agent::sessions::ObservedStore::new(
            Rc::new(database.clone()),
            observers.clone(),
        )),
        Rc::new(move |error| {
            assert!(
                error.to_string().contains("injected fold failure"),
                "unexpected Platform API error: {error}"
            );
            error_count.set(error_count.get() + 1);
        }),
    ));
    let server_task = tokio::task::spawn_local(server.serve(listener));

    let native = "0f0e0d0c-0b0a-4908-8706-050403020100";
    let transcript = "/home/agent/.claude/projects/-home-agent-code/0f0e0d0c-0b0a-4908-8706-050403020100.jsonl";
    let report = format!(
        r#"{{"eventId":"00000000-0000-4000-8000-000000000001","sessionId":"{}","event":"sessionStart","nativeSessionId":"{native}","transcriptPath":"{transcript}","source":"startup"}}"#,
        session.id
    );

    assert_eq!(request_to(port, "/v1/session-reports", TOKEN_1, &report).await, 404);
    // A stale or foreign token authenticates as nothing.
    assert_eq!(request(port, "unknown-token", &report).await, 401);
    // A valid token for a different platform Session is rejected.
    let mismatched = format!(
        r#"{{"eventId":"00000000-0000-4000-8000-000000000001","sessionId":"{agent_id}","event":"sessionStart","nativeSessionId":"{native}"}}"#
    );
    assert_eq!(request(port, TOKEN_1, &mismatched).await, 401);
    // Harness-native IDs are opaque to the platform layer.
    let opaque = format!(
        r#"{{"eventId":"00000000-0000-4000-8000-000000000006","sessionId":"{}","event":"sessionStart","nativeSessionId":"opaque-harness-id"}}"#,
        session.id
    );
    assert_eq!(request(port, TOKEN_1, &opaque).await, 204);
    let stored = database.get_session(session.id).await.expect("session");
    assert_eq!(
        stored.status.reported.harness_session_id.as_deref(),
        Some("opaque-harness-id")
    );
    assert_eq!(stored.status.reported.harness_transcript_path, None);
    // A transcript location must be an absolute Sandbox path.
    let relative = format!(
        r#"{{"eventId":"00000000-0000-4000-8000-000000000001","sessionId":"{}","event":"sessionStart","nativeSessionId":"{native}","transcriptPath":"relative.jsonl"}}"#,
        session.id
    );
    assert_eq!(request(port, TOKEN_1, &relative).await, 400);

    let empty = format!(
        r#"{{"eventId":"00000000-0000-4000-8000-000000000001","sessionId":"{}","event":"sessionStart","nativeSessionId":""}}"#,
        session.id
    );
    assert_eq!(request(port, TOKEN_1, &empty).await, 400);

    assert_eq!(request(port, TOKEN_1, &report).await, 204);
    let stored = database.get_session(session.id).await.expect("session");
    assert_eq!(stored.status.reported.harness_session_id.as_deref(), Some(native));
    assert_eq!(
        stored.status.reported.harness_transcript_path.as_deref(),
        Some(transcript)
    );
    assert_eq!(stored.status.reported.activity.phase, agent::sessions::Phase::Working);

    // A replay of an older start must not overwrite the newer conversation.
    let mut start_feed = observers.subscribe(session.id);
    assert_eq!(request(port, TOKEN_1, &opaque).await, 204);
    assert_eq!(
        database.get_session(session.id).await.expect("session").status.reported,
        stored.status.reported
    );
    assert!(
        !start_feed.has_changed().expect("observer"),
        "duplicates do not publish"
    );

    let inspect = rusqlite::Connection::open(directory.path().join("agent.db")).expect("inspect");
    let next_start = report
        .replace("000000000001", "000000000007")
        .replace(native, "next-conversation");
    inspect.execute_batch("CREATE TRIGGER reject_activity BEFORE UPDATE OF activity_json ON sessions BEGIN SELECT RAISE(ABORT, 'injected fold failure'); END;").expect("inject failure");
    assert_eq!(request(port, TOKEN_1, &next_start).await, 500);
    assert_eq!(reported_errors.get(), 1);
    assert_eq!(
        database.get_session(session.id).await.expect("session").status.reported,
        stored.status.reported
    );
    assert!(
        !start_feed.has_changed().expect("observer"),
        "rolled-back reports do not publish"
    );
    inspect
        .execute_batch("DROP TRIGGER reject_activity;")
        .expect("remove failure");
    assert_eq!(request(port, TOKEN_1, &next_start).await, 204);
    let applied = database.get_session(session.id).await.expect("session");
    assert_eq!(
        applied.status.reported.harness_session_id.as_deref(),
        Some("next-conversation")
    );
    assert!(start_feed.has_changed().expect("observer"), "committed reports publish");
    start_feed.borrow_and_update();
    assert_eq!(request(port, TOKEN_1, &next_start).await, 204);
    assert!(!start_feed.has_changed().expect("observer"));
    // Restore the conversation with a new event for the remaining assertions.
    assert_eq!(
        request(port, TOKEN_1, &report.replace("000000000001", "000000000008")).await,
        204
    );

    // Lifecycle writes cannot touch the reported half.
    database
        .update_session_lifecycle(session.id, agent::sessions::Lifecycle::running(), 0)
        .await
        .expect("status update");
    let stored = database.get_session(session.id).await.expect("session");
    assert_eq!(stored.status.reported.harness_session_id.as_deref(), Some(native));
    assert_eq!(stored.status.lifecycle.state, agent::sessions::LifecycleState::Running);

    // Activity events fold into the report and wake Session observers.
    let mut feed = observers.subscribe(session.id);
    let before_events = *feed.borrow();
    let event = |name: &str| {
        let suffix = match name {
            "turnStarted" => 2,
            "waitingForInput" => 3,
            "turnCompleted" => 4,
            _ => 5,
        };
        format!(
            r#"{{"eventId":"00000000-0000-4000-8000-{suffix:012}","sessionId":"{}","event":"{name}"}}"#,
            session.id
        )
    };
    assert_eq!(request(port, TOKEN_1, &event("turnStarted")).await, 204);
    assert_eq!(request(port, TOKEN_1, &event("waitingForInput")).await, 204);
    assert_eq!(request(port, TOKEN_1, &event("turnCompleted")).await, 204);
    // A successful completion whose HTTP response was lost must not count twice.
    assert_eq!(request(port, TOKEN_1, &event("turnCompleted")).await, 204);
    let stored = database.get_session(session.id).await.expect("session");
    assert_eq!(stored.status.reported.activity.turns, 1);
    assert_eq!(
        stored.status.reported.activity.phase,
        agent::sessions::Phase::WaitingForInput
    );
    assert!(stored.status.reported.activity.last_event_at.is_some());
    assert!(feed.has_changed().expect("feed open"));
    assert_eq!(
        *feed.borrow_and_update() - before_events,
        3,
        "one change tick per folded event"
    );
    // An unknown event is a malformed report.
    assert_eq!(request(port, TOKEN_1, &event("danced")).await, 400);

    // A relaunch rotates the token; the old incarnation's token stops working.
    database
        .record_session_launch(
            session.id,
            LaunchRecord {
                token: TOKEN_2.parse().expect("launch token"),
                sandbox: "sandbox-1".into(),
                launched_at: 1,
                attempts: 2,
            },
        )
        .await
        .expect("record relaunch");
    // The relaunch reset what the old launch reported, so the Session is
    // Starting again until the new process reports; the old ID stays for resume.
    let relaunched = database.get_session(session.id).await.expect("session");
    assert_eq!(relaunched.status.state, agent::sessions::State::Starting);
    assert_eq!(relaunched.status.reported.activity.turns, 0);
    assert_eq!(relaunched.status.reported.harness_session_id.as_deref(), Some(native));
    assert_eq!(request(port, TOKEN_1, &report).await, 401);
    // A stale token's activity report is a silent no-op, not an error the hook retries.
    assert_eq!(request(port, TOKEN_1, &event("turnCompleted")).await, 204);
    assert_eq!(
        database
            .get_session(session.id)
            .await
            .expect("session")
            .status
            .reported
            .activity
            .turns,
        0
    );
    assert_eq!(request(port, TOKEN_2, &report).await, 204);

    server_task.abort();
}

#[tokio::test(flavor = "local")]
async fn launch_bookkeeping_round_trips_and_resets() {
    let directory = TempDir::new().expect("temporary directory");
    let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
    let agent_id = "48f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
    database.put(ready_record("worker", agent_id), 0).await.expect("Agent");
    let session = database
        .ensure_session(
            "worker",
            &SessionName::new("s1").expect("name"),
            agent::Harness::ClaudeCode,
            None,
        )
        .await
        .expect("session");

    assert_eq!(
        database.session_launch_state(session.id).await.expect("empty state"),
        None
    );
    database
        .record_session_launch(
            session.id,
            LaunchRecord {
                token: "cccccccc-cccc-4ccc-8ccc-cccccccccccc".parse().expect("launch token"),
                sandbox: "sandbox-1".into(),
                launched_at: 42,
                attempts: 3,
            },
        )
        .await
        .expect("record launch");
    let state = database
        .session_launch_state(session.id)
        .await
        .expect("state")
        .expect("recorded state");
    assert_eq!(state.sandbox, "sandbox-1");
    assert_eq!(state.launched_at, 42);
    assert_eq!(state.attempts, 3);

    database
        .reset_session_launch_attempts(session.id)
        .await
        .expect("reset attempts");
    let state = database
        .session_launch_state(session.id)
        .await
        .expect("state")
        .expect("recorded state");
    assert_eq!(state.attempts, 0);
}

#[tokio::test(flavor = "local")]
async fn platform_api_bounds_stalled_connections() {
    const TOKEN: &str = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    let directory = TempDir::new().expect("temporary directory");
    let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
    let listener = agent::platform_api::bind_persistent(&directory.path().join("platform-api-port"))
        .await
        .expect("bind Platform API listener");
    let port = listener.local_addr().expect("local address").port();
    let server = Rc::new(agent::platform_api::Server::new(
        Rc::new(database),
        Rc::new(|_error| {}),
    ));
    let server_task = tokio::task::spawn_local(server.serve(listener));

    let mut stalled = Vec::new();
    for _ in 0..64 {
        let mut stream = tokio::net::TcpStream::connect(("127.0.0.1", port))
            .await
            .expect("connect stalled client");
        stream.write_all(b"P").await.expect("start incomplete request");
        stalled.push(stream);
        tokio::task::yield_now().await;
    }
    tokio::time::sleep(Duration::from_millis(25)).await;

    let blocked = tokio::time::timeout(
        Duration::from_millis(100),
        request_to(port, "/v1/session/hooks", TOKEN, "{}"),
    )
    .await;
    assert!(blocked.is_err(), "a connection beyond the limit must wait for capacity");

    drop(stalled.pop());
    let status = tokio::time::timeout(
        Duration::from_secs(1),
        request_to(port, "/v1/session/hooks", TOKEN, "{}"),
    )
    .await
    .expect("request should proceed after capacity is released");
    assert_eq!(status, 400);

    server_task.abort();
}
