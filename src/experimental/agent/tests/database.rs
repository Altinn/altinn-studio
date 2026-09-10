#![allow(clippy::expect_used)]

mod support;

use std::path::{Path, PathBuf};

use agent::{
    AgentId, Condition, ConditionStatus, Error, Status,
    control_plane::{AgentRecord, AgentStore as _},
    persistence,
    sandbox::{Assignment, ProviderId},
    sessions::{Lifecycle, SessionName, SessionReports as _, SessionStore as _},
};
use sandbox::secret_store::SecretStore as _;
use tempfile::TempDir;
use tokio::runtime::LocalRuntime;

fn test_agent_id() -> AgentId {
    "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID")
}

fn record_with_id(name: &str, generation: u64, id: AgentId) -> AgentRecord {
    let mut agent = support::agent(name);
    agent.metadata.generation = generation;
    AgentRecord {
        id,
        source_directory: PathBuf::from("/source"),
        manifest_path: None,
        env_file: None,
        agent,
    }
}

fn record(name: &str, generation: u64) -> AgentRecord {
    record_with_id(name, generation, test_agent_id())
}

fn ready_record(name: &str, id: AgentId) -> AgentRecord {
    let mut ready = record_with_id(name, 1, id);
    ready.agent.status = Status::observed(
        1,
        Some(Assignment::Materialized {
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
    ready
}

const PREVIEW_1_SCHEMA: &str = "
    CREATE TABLE agents (
        id TEXT PRIMARY KEY NOT NULL,
        active_name TEXT UNIQUE,
        source_directory TEXT NOT NULL,
        desired_json TEXT NOT NULL,
        deletion_timestamp INTEGER,
        status_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE secrets (
        name TEXT PRIMARY KEY NOT NULL,
        value BLOB NOT NULL
    );
    CREATE TABLE provider_accounts (
        provider TEXT PRIMARY KEY NOT NULL,
        metadata_json TEXT NOT NULL
    );
    CREATE TABLE sessions (
        id TEXT PRIMARY KEY NOT NULL,
        agent_id TEXT NOT NULL REFERENCES agents(id),
        name TEXT NOT NULL,
        harness TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        activation_generation INTEGER NOT NULL DEFAULT 0,
        lifecycle_json TEXT NOT NULL DEFAULT '{}',
        harness_native_id TEXT,
        launch_token TEXT UNIQUE,
        launch_sandbox TEXT,
        launched_at INTEGER,
        launch_attempts INTEGER NOT NULL DEFAULT 0,
        UNIQUE (agent_id, name)
    );
    PRAGMA user_version = 1;
";

const PREVIEW_AGENT_ID: &str = "11111111-1111-4111-8111-111111111111";
const PREVIEW_DELETED_AGENT_ID: &str = "22222222-2222-4222-8222-222222222222";
const PREVIEW_SECRET: &[u8] = b"\0preview-one-secret\xff";

fn preview_desired(name: &str) -> String {
    let mut desired = serde_json::to_value(support::agent(name)).expect("serialize fixture Agent");
    let spec = desired["spec"].as_object_mut().expect("fixture spec");
    let mut instructions = spec.remove("instructions").expect("fixture instructions");
    let instruction = instructions.as_array_mut().expect("current instructions").remove(0);
    spec.insert("instructions".into(), instruction);
    spec.remove("skills");
    serde_json::to_string(&desired).expect("encode preview desired state")
}

fn create_preview_1_database(path: &Path) {
    let connection = rusqlite::Connection::open(path).expect("create preview 1 database");
    connection.execute_batch(PREVIEW_1_SCHEMA).expect("preview 1 schema");
    connection
        .execute(
            "INSERT INTO agents \
             (id, active_name, source_directory, desired_json, deletion_timestamp, status_json) \
             VALUES (?1, 'worker', ?2, ?3, NULL, '{}'), (?4, NULL, ?5, ?6, 1700000000, '{}')",
            rusqlite::params![
                PREVIEW_AGENT_ID,
                serde_json::to_string(Path::new("/preview/source")).expect("source"),
                preview_desired("worker"),
                PREVIEW_DELETED_AGENT_ID,
                serde_json::to_string(Path::new("/preview/deleted")).expect("deleted source"),
                preview_desired("deleted")
            ],
        )
        .expect("preview Agents");
    for (index, state) in (0_i64..).zip(["starting", "running", "idle", "failed"]) {
        let id = format!("00000000-0000-4000-8000-{index:012}");
        let lifecycle = serde_json::json!({
            "state": state,
            "failure": (state == "failed").then_some("preview failure"),
            "observedActivationGeneration": index,
        });
        connection
            .execute(
                "INSERT INTO sessions \
                 (id, agent_id, name, harness, created_at, activation_generation, lifecycle_json, \
                  harness_native_id, launch_token, launch_sandbox, launched_at, launch_attempts) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'preview-sandbox', ?10, ?11)",
                rusqlite::params![
                    id,
                    PREVIEW_AGENT_ID,
                    format!("session-{state}"),
                    if index % 2 == 0 { "claudeCode" } else { "codex" },
                    1_700_000_000_i64 + index,
                    index,
                    serde_json::to_string(&lifecycle).expect("lifecycle"),
                    format!("native-{index}"),
                    format!("00000000-0000-4000-9000-{index:012}"),
                    1_700_000_100_i64 + index,
                    index + 1,
                ],
            )
            .expect("preview Session");
    }
    connection
        .execute(
            "INSERT INTO secrets (name, value) VALUES ('claude-access-token', ?1)",
            [PREVIEW_SECRET],
        )
        .expect("preview secret");
    connection
        .execute(
            "INSERT INTO provider_accounts (provider, metadata_json) VALUES ('claudeCode', ?1)",
            [r#"{"account":"preview-user"}"#],
        )
        .expect("preview provider account");
}

#[test]
fn stores_scrub_projected_provenance_and_keep_recorded_manifest_paths() {
    let directory = TempDir::new().expect("temporary directory");
    let store = persistence::Database::open(&directory.path().join("control-plane.db")).expect("open database");
    LocalRuntime::new().expect("local runtime").block_on(async {
        let mut record = ready_record("worker", test_agent_id());
        record.manifest_path = Some(PathBuf::from("/source/worker.yml"));
        record.agent.status.provenance = Some(agent::Provenance {
            source_directory: PathBuf::from("/leaked"),
            manifest_path: None,
            env_file: None,
        });
        store.put(record.clone(), 0).await.expect("Agent stored");

        let stored = store.get(record.id).await.expect("Agent loaded");
        assert_eq!(stored.agent.status.provenance, None);
        assert_eq!(stored.manifest_path.as_deref(), Some(Path::new("/source/worker.yml")));
        assert_eq!(stored.source_directory, record.source_directory);

        let mut status = stored.agent.status.clone();
        status.provenance = Some(agent::Provenance {
            source_directory: PathBuf::from("/leaked"),
            manifest_path: None,
            env_file: None,
        });
        store
            .update_status(record.id, stored.agent.metadata.generation, status)
            .await
            .expect("status updated");
        let reloaded = store.get(record.id).await.expect("Agent reloaded");
        assert_eq!(reloaded.agent.status.provenance, None);
        assert_eq!(reloaded.agent.status.conditions, stored.agent.status.conditions);
        assert_eq!(reloaded.manifest_path.as_deref(), Some(Path::new("/source/worker.yml")));
        assert_eq!(reloaded.source_directory, record.source_directory);
    });
}

#[test]
fn sessions_are_idempotent_and_survive_database_reopen() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("control-plane.db");
    let first = persistence::Database::open(&path).expect("open first database owner");
    LocalRuntime::new().expect("local runtime").block_on(async {
        let ready = ready_record("worker", test_agent_id());
        first.put(ready, 0).await.expect("ready Agent");
        let name = SessionName::new("s1").expect("session name");
        let created = first
            .ensure_session("worker", &name, agent::Harness::ClaudeCode, Some("first prompt"))
            .await
            .expect("create session");
        let existing = first
            .ensure_session(
                "worker",
                &name,
                agent::Harness::ClaudeCode,
                Some("ignored: not created here"),
            )
            .await
            .expect("get session");
        assert_eq!(created.agent_id, test_agent_id());
        assert_eq!(created.harness, agent::Harness::ClaudeCode);
        assert_eq!(created, existing);
        first
            .update_session_lifecycle(created.id, Lifecycle::running(), 0)
            .await
            .expect("persist observed state");
    });
    drop(first);

    let second = persistence::Database::open(&path).expect("reopen database owner");
    LocalRuntime::new().expect("local runtime").block_on(async {
        let sessions = second.list_agent_sessions("worker").await.expect("persistent sessions");
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].name.as_str(), "s1");
        assert_eq!(sessions[0].harness, agent::Harness::ClaudeCode);
        assert_eq!(
            sessions[0].status.lifecycle.state,
            agent::sessions::LifecycleState::Running
        );
        assert_eq!(
            rusqlite::Connection::open(&path)
                .expect("read database")
                .query_row(
                    "SELECT initial_prompt FROM sessions WHERE id = ?1",
                    [sessions[0].id.to_string()],
                    |row| row.get::<_, Option<String>>(0)
                )
                .expect("initial prompt")
                .as_deref(),
            Some("first prompt"),
            "the first prompt is recorded once, at creation"
        );
        assert_eq!(
            second
                .get_agent_session("worker", &SessionName::new("s1").expect("Session name"))
                .await
                .expect("named Session"),
            sessions[0]
        );
    });
}

#[test]
fn attach_error_identifies_the_session_and_its_lifecycle_failure() {
    let directory = TempDir::new().expect("temporary directory");
    let store = persistence::Database::open(&directory.path().join("control-plane.db")).expect("open database");
    LocalRuntime::new().expect("local runtime").block_on(async {
        store
            .put(ready_record("worker", test_agent_id()), 0)
            .await
            .expect("ready Agent");
        let session = store
            .ensure_session(
                "worker",
                &SessionName::new("recovering").expect("Session name"),
                agent::Harness::Codex,
                None,
            )
            .await
            .expect("Session");
        store
            .update_session_lifecycle(
                session.id,
                Lifecycle::starting("harness exited; relaunching after up to 10s of backoff"),
                1,
            )
            .await
            .expect("lifecycle");

        assert_eq!(
            store
                .session_attach_target(session.id)
                .await
                .expect_err("Session is not running")
                .to_string(),
            "invalid Agent: Session \"recovering\" is not running: harness exited; relaunching after up to 10s of backoff"
        );
    });
}

#[test]
fn finalized_agents_and_their_sessions_remain_as_tombstones_when_a_name_is_reused() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("control-plane.db");
    let store = persistence::Database::open(&path).expect("open database owner");
    let old_id = "f9fc2dac-ae2d-4534-a9c1-dd13dd9b5160".parse().expect("old Agent ID");
    let new_id = "f50fbec8-03a9-43ea-b65d-c15a86e9eb65".parse().expect("new Agent ID");
    LocalRuntime::new().expect("local runtime").block_on(async {
        store.put(ready_record("worker", old_id), 0).await.expect("old Agent");
        let old_session = SessionName::new("old-session").expect("session name");
        store
            .ensure_session("worker", &old_session, agent::Harness::ClaudeCode, None)
            .await
            .expect("old session");
        store.mark_deleting("worker").await.expect("mark deleting");
        store.finalize_deletion(old_id, 1).await.expect("finalize deletion");
        assert!(matches!(store.get(old_id).await, Err(Error::NotFound)));

        store
            .put(ready_record("worker", new_id), 0)
            .await
            .expect("new Agent incarnation");
        let sessions = store.list_agent_sessions("worker").await.expect("new Agent sessions");
        assert!(sessions.is_empty());
    });
    drop(store);

    let connection = rusqlite::Connection::open(path).expect("inspect database");
    assert_eq!(
        connection
            .query_row("SELECT COUNT(*) FROM agents", [], |row| row.get::<_, i64>(0))
            .expect("Agent count"),
        2
    );
    assert_eq!(
        connection
            .query_row("SELECT COUNT(*) FROM sessions", [], |row| row.get::<_, i64>(0))
            .expect("session count"),
        1
    );
}

#[test]
fn released_preview_1_database_migrates_without_losing_state() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("control-plane.db");
    create_preview_1_database(&path);

    let database = persistence::Database::open(&path).expect("migrate preview 1 database");
    LocalRuntime::new().expect("local runtime").block_on(async {
        let agent = database
            .get(PREVIEW_AGENT_ID.parse().expect("preview Agent ID"))
            .await
            .expect("migrated Agent");
        assert_eq!(agent.source_directory, Path::new("/preview/source"));
        assert_eq!(agent.agent.spec.instructions.len(), 1);
        assert!(agent.agent.spec.skills.is_empty());
        let sessions = database.list_agent_sessions("worker").await.expect("migrated Sessions");
        assert_eq!(sessions.len(), 4);
        assert_eq!(
            sessions[0].status.lifecycle.state,
            agent::sessions::LifecycleState::Failed
        );
        assert_eq!(
            sessions[1].status.lifecycle.state,
            agent::sessions::LifecycleState::Idle
        );
        assert_eq!(
            sessions[2].status.lifecycle.state,
            agent::sessions::LifecycleState::Running
        );
        assert_eq!(
            sessions[3].status.lifecycle.state,
            agent::sessions::LifecycleState::Starting
        );
    });
    drop(database);

    let connection = rusqlite::Connection::open(&path).expect("inspect migrated database");
    assert_eq!(
        connection
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .expect("schema version"),
        2
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT source_directory FROM agents WHERE id = ?1",
                [PREVIEW_DELETED_AGENT_ID],
                |row| row.get::<_, String>(0),
            )
            .expect("deleted Agent source"),
        serde_json::to_string(Path::new("/preview/deleted")).expect("source")
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT value FROM secrets WHERE name = 'claude-access-token'",
                [],
                |row| { row.get::<_, Vec<u8>>(0) }
            )
            .expect("migrated secret"),
        PREVIEW_SECRET
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT metadata_json FROM provider_accounts WHERE provider = 'claudeCode'",
                [],
                |row| row.get::<_, String>(0),
            )
            .expect("provider metadata"),
        r#"{"account":"preview-user"}"#
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT COUNT(*) FROM sessions \
                 WHERE initial_prompt IS NULL AND harness_transcript_path IS NULL AND activity_json = '{}'",
                [],
                |row| row.get::<_, u32>(0),
            )
            .expect("migrated Session defaults"),
        4
    );
}

#[test]
fn expanded_or_partial_version_1_schemas_are_rejected_without_mutation() {
    for shape in ["expanded", "partial"] {
        let directory = TempDir::new().expect("temporary directory");
        let path = directory.path().join("control-plane.db");
        if shape == "expanded" {
            let database = persistence::Database::open(&path).expect("current database");
            drop(database);
            let connection = rusqlite::Connection::open(&path).expect("mark expanded schema as version 1");
            connection.pragma_update(None, "user_version", 1).expect("version 1");
        } else {
            let connection = rusqlite::Connection::open(&path).expect("partial database");
            connection
                .execute_batch("CREATE TABLE agents (id TEXT PRIMARY KEY NOT NULL); PRAGMA user_version = 1;")
                .expect("partial version 1 schema");
        }
        let before = schema_snapshot(&path);
        let Err(error) = persistence::Database::open(&path) else {
            panic!("{shape} schema should be rejected");
        };
        assert!(error.to_string().contains("not a recognized released schema"));
        assert_eq!(schema_snapshot(&path), before, "rejection must not mutate {shape}");
    }
}

#[test]
fn future_schema_is_rejected_without_mutation() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("control-plane.db");
    let connection = rusqlite::Connection::open(&path).expect("future database");
    connection
        .pragma_update(None, "user_version", 99)
        .expect("future version");
    drop(connection);
    let before = schema_snapshot(&path);
    let Err(error) = persistence::Database::open(&path) else {
        panic!("future schema should be rejected");
    };
    assert!(error.to_string().contains("newer than the supported schema"));
    assert_eq!(
        rusqlite::Connection::open(&path)
            .expect("inspect future database")
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .expect("future version"),
        99
    );
    assert_eq!(schema_snapshot(&path), before);
}

#[test]
fn failed_preview_1_row_migration_rolls_back_schema_and_rows() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("control-plane.db");
    create_preview_1_database(&path);
    let connection = rusqlite::Connection::open(&path).expect("corrupt preview fixture");
    connection
        .execute(
            "UPDATE agents SET desired_json = 'not-json' WHERE id = ?1",
            [PREVIEW_DELETED_AGENT_ID],
        )
        .expect("corrupt later Agent row");
    drop(connection);
    let before = schema_snapshot(&path);
    let valid_desired = connection_value(&path, PREVIEW_AGENT_ID, "desired_json");

    let Err(error) = persistence::Database::open(&path) else {
        panic!("malformed desired state should fail migration");
    };
    assert!(error.to_string().contains("invalid desired state during migration"));
    assert_eq!(schema_snapshot(&path), before);
    assert_eq!(connection_value(&path, PREVIEW_AGENT_ID, "desired_json"), valid_desired);
    let connection = rusqlite::Connection::open(path).expect("inspect rollback");
    assert_eq!(
        connection
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .expect("rolled-back version"),
        1
    );
}

fn schema_snapshot(path: &Path) -> (u32, Vec<(String, String)>) {
    let connection = rusqlite::Connection::open(path).expect("snapshot database");
    let version = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .expect("snapshot version");
    let mut statement = connection
        .prepare(
            "SELECT type || ':' || name, coalesce(sql, '') FROM sqlite_schema \
             WHERE name NOT LIKE 'sqlite_%' ORDER BY 1",
        )
        .expect("snapshot query");
    let schema = statement
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .expect("snapshot rows")
        .collect::<Result<_, _>>()
        .expect("snapshot values");
    (version, schema)
}

fn connection_value(path: &Path, id: &str, column: &str) -> String {
    let connection = rusqlite::Connection::open(path).expect("read fixture value");
    connection
        .query_row(&format!("SELECT {column} FROM agents WHERE id = ?1"), [id], |row| {
            row.get(0)
        })
        .expect("fixture value")
}

#[test]
fn secret_material_is_persistent_and_replaced_by_name() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("control-plane.db");
    let first = persistence::Database::open(&path).expect("open first database owner");
    LocalRuntime::new().expect("local runtime").block_on(async {
        first.set("claude-access", b"first").await.expect("store secret");
    });
    drop(first);

    let second = persistence::Database::open(&path).expect("reopen database owner");
    LocalRuntime::new().expect("local runtime").block_on(async {
        let reference = second.set("claude-access", b"second").await.expect("replace secret");
        let material = second.resolve(&reference).await.expect("resolve secret");
        assert_eq!(material.expose(), b"second");
    });
}

#[test]
fn finalizing_an_agent_removes_only_its_scoped_secret_material() {
    let directory = TempDir::new().expect("temporary directory");
    let store = persistence::Database::open(&directory.path().join("control-plane.db")).expect("database");
    LocalRuntime::new().expect("local runtime").block_on(async {
        let id = test_agent_id();
        store.put(record("worker", 1), 0).await.expect("Agent");
        let agent_secret = store
            .set(&format!("agent/{id}/github-token"), b"github-secret")
            .await
            .expect("Agent secret");
        let provider_secret = store
            .set("claude-access-token", b"claude-secret")
            .await
            .expect("provider secret");

        store.mark_deleting("worker").await.expect("mark deleting");
        store.finalize_deletion(id, 1).await.expect("finalize deletion");

        assert!(store.resolve(&agent_secret).await.is_err());
        assert_eq!(
            store
                .resolve(&provider_secret)
                .await
                .expect("provider secret remains")
                .expose(),
            b"claude-secret"
        );
    });
}

#[test]
fn agent_records_survive_reopen_and_preserve_compare_and_swap() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("control-plane.db");
    let first = persistence::Database::open(&path).expect("open first database owner");
    LocalRuntime::new().expect("local runtime").block_on(async {
        first
            .put(record("worker", 1), 0)
            .await
            .expect("insert first generation");
        let error = first
            .put(record("worker", 2), 0)
            .await
            .expect_err("duplicate create should conflict");
        assert!(matches!(error, Error::Conflict));
    });
    drop(first);

    let second = persistence::Database::open(&path).expect("reopen database owner");
    LocalRuntime::new().expect("local runtime").block_on(async {
        assert_eq!(
            second.get(test_agent_id()).await.expect("persistent record"),
            record("worker", 1)
        );
        second.put(record("worker", 2), 1).await.expect("compare and swap");
        let error = second
            .update_status(test_agent_id(), 1, Status::default())
            .await
            .expect_err("stale status should conflict");
        assert!(matches!(error, Error::Conflict));
    });
}

#[test]
fn desired_state_cannot_change_after_deletion_starts() {
    let directory = TempDir::new().expect("temporary directory");
    let store = persistence::Database::open(&directory.path().join("control-plane.db")).expect("database");
    LocalRuntime::new().expect("local runtime").block_on(async {
        store.put(record("worker", 1), 0).await.expect("Agent");
        let mut stale = store.get_by_name("worker").await.expect("stale desired state");
        store.mark_deleting("worker").await.expect("mark deleting");

        stale.agent.metadata.generation = 2;
        let error = store
            .put(stale, 1)
            .await
            .expect_err("deleting Agent must reject desired-state updates");
        assert!(matches!(error, Error::Conflict));
        assert!(
            store
                .get_by_name("worker")
                .await
                .expect("deleting Agent")
                .agent
                .metadata
                .deletion_timestamp
                .is_some()
        );
    });
}

#[tokio::test(flavor = "local")]
async fn initial_prompt_consumption_and_launch_record_commit_together() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("agent.db");
    let database = persistence::Database::open(&path).expect("database");
    database
        .put(ready_record("worker", test_agent_id()), 0)
        .await
        .expect("Agent");
    let session = database
        .ensure_session(
            "worker",
            &SessionName::new("s1").expect("name"),
            agent::Harness::ClaudeCode,
            Some("once"),
        )
        .await
        .expect("Session");
    let token: agent::sessions::LaunchToken = "cccccccc-cccc-4ccc-8ccc-cccccccccccc".parse().expect("token");
    let launch = agent::sessions::LaunchRecord {
        token: token.clone(),
        sandbox: "sandbox-1".into(),
        launched_at: 0,
        attempts: 1,
    };
    let inspect = rusqlite::Connection::open(&path).expect("inspect");
    inspect.execute_batch("CREATE TRIGGER reject_consumption AFTER UPDATE OF initial_prompt ON sessions WHEN OLD.initial_prompt IS NOT NULL AND NEW.initial_prompt IS NULL BEGIN SELECT RAISE(ABORT, 'injected consumption failure'); END;").expect("inject failure");
    database
        .record_session_launch(session.id, launch.clone())
        .await
        .expect_err("consumption failure");
    assert_eq!(
        database.session_launch_state(session.id).await.expect("state"),
        None,
        "failed consumption rolls back launch bookkeeping"
    );
    inspect
        .execute_batch("DROP TRIGGER reject_consumption;")
        .expect("remove failure");
    assert_eq!(
        database
            .record_session_launch(session.id, launch.clone())
            .await
            .expect("consume"),
        Some("once".into()),
        "failed transaction did not consume the prompt"
    );
    drop(database);
    let reopened = persistence::Database::open(&path).expect("reopen");
    assert_eq!(
        reopened
            .record_session_launch(session.id, launch)
            .await
            .expect("relaunch"),
        None,
        "recovery after a crash never replays the prompt"
    );
}

#[tokio::test(flavor = "local")]
async fn activity_deduplication_is_durable_and_rolls_back_with_the_fold() {
    use agent::sessions::{ActivityEvent, LaunchRecord};
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("agent.db");
    let database = persistence::Database::open(&path).expect("database");
    database
        .put(ready_record("worker", test_agent_id()), 0)
        .await
        .expect("Agent");
    let session = database
        .ensure_session(
            "worker",
            &SessionName::new("s1").expect("name"),
            agent::Harness::ClaudeCode,
            None,
        )
        .await
        .expect("Session");
    let token: agent::sessions::LaunchToken = "cccccccc-cccc-4ccc-8ccc-cccccccccccc".parse().expect("token");
    database
        .record_session_launch(
            session.id,
            LaunchRecord {
                token: token.clone(),
                sandbox: "sandbox-1".into(),
                launched_at: 0,
                attempts: 1,
            },
        )
        .await
        .expect("launch");
    let event_id = uuid::Uuid::new_v4();
    let at = time::OffsetDateTime::now_utc();
    let inspect = rusqlite::Connection::open(&path).expect("inspect");
    inspect.execute_batch("CREATE TRIGGER reject_activity BEFORE UPDATE OF activity_json ON sessions BEGIN SELECT RAISE(ABORT, 'injected fold failure'); END;").expect("inject failure");
    database
        .apply_session_activity_for_launch(session.id, &token, event_id, ActivityEvent::TurnCompleted, at)
        .await
        .expect_err("fold failure");
    inspect
        .execute_batch("DROP TRIGGER reject_activity;")
        .expect("remove failure");
    let activity = database
        .apply_session_activity_for_launch(session.id, &token, event_id, ActivityEvent::TurnCompleted, at)
        .await
        .expect("retry")
        .expect("applied");
    assert_eq!(activity.turns, 1, "rolled-back receipt must not suppress the retry");
    drop(database);
    let reopened = persistence::Database::open(&path).expect("reopen");
    assert_eq!(
        reopened
            .apply_session_activity_for_launch(session.id, &token, event_id, ActivityEvent::TurnCompleted, at)
            .await
            .expect("lost response retry"),
        None
    );
    assert_eq!(
        reopened
            .get_session(session.id)
            .await
            .expect("Session")
            .status
            .reported
            .activity,
        activity,
        "duplicate does not change count, phase, or timestamp"
    );
}
