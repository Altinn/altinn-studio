#![allow(clippy::expect_used)]

mod support;

use std::path::PathBuf;

use agent::{
    AgentId, Condition, ConditionStatus, Error, Status,
    control_plane::{AgentRecord, AgentStore as _},
    persistence,
    sandbox::{Assignment, ProviderId},
    sessions::{SessionName, SessionStore as _, Status as SessionStatus},
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
        agent,
    }
}

fn record(name: &str, generation: u64) -> AgentRecord {
    record_with_id(name, generation, test_agent_id())
}

fn ready_record(name: &str, id: AgentId) -> AgentRecord {
    let mut ready = record_with_id(name, 1, id);
    ready.agent.status = Status {
        observed_generation: 1,
        sandbox: Some(Assignment::Materialized {
            provider: ProviderId::new("memory").expect("Provider ID"),
            id: "3f978c33-4d43-4ea4-b58d-10b90ef166af".parse().expect("Sandbox ID"),
        }),
        conditions: vec![Condition {
            kind: "Ready".into(),
            status: ConditionStatus::True,
            reason: "SandboxReady".into(),
            message: String::new(),
        }],
    };
    ready
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
            .ensure_session("worker", &name, agent::Harness::ClaudeCode)
            .await
            .expect("create session");
        let existing = first
            .ensure_session("worker", &name, agent::Harness::ClaudeCode)
            .await
            .expect("get session");
        assert_eq!(created.agent_id, test_agent_id());
        assert_eq!(created.harness, agent::Harness::ClaudeCode);
        assert_eq!(created, existing);
        first
            .update_session_status(
                created.id,
                SessionStatus {
                    state: agent::sessions::State::Running,
                    failure: None,
                    harness_session_id: None,
                },
                0,
            )
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
        assert_eq!(sessions[0].status.state, agent::sessions::State::Running);
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
            .ensure_session("worker", &old_session, agent::Harness::ClaudeCode)
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
fn incompatible_schema_requires_an_explicit_purge() {
    let directory = TempDir::new().expect("temporary directory");
    let path = directory.path().join("control-plane.db");
    let connection = rusqlite::Connection::open(&path).expect("create incompatible database");
    connection
        .execute_batch("CREATE TABLE agents (name TEXT PRIMARY KEY NOT NULL, record_json TEXT NOT NULL);")
        .expect("incompatible schema");
    drop(connection);

    let Err(error) = persistence::Database::open(&path) else {
        panic!("incompatible schema should not be migrated");
    };
    assert!(error.to_string().contains("purge the Agent home"));
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
