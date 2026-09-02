//! Session persistence with one column group per write owner.

use rusqlite::{Connection, OptionalExtension as _, params};
use serde::{Deserialize, Serialize};

use crate::{
    AgentId, ConditionStatus, Error, Harness,
    sandbox::Assignment,
    sessions::{AttachTarget, LaunchState, LaunchToken, Session, SessionId, SessionName, State, Status},
};

use super::{agents, database_error};

const SESSION_COLUMNS: &str = "sessions.id, sessions.agent_id, agents.active_name, sessions.name, \
    sessions.harness, sessions.created_at, sessions.activation_generation, sessions.lifecycle_json, \
    sessions.harness_native_id";

#[derive(Default, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Lifecycle {
    #[serde(default)]
    state: State,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    failure: Option<String>,
    #[serde(default)]
    observed_activation_generation: u64,
}

pub(super) fn ensure(
    connection: &mut Connection,
    agent: &str,
    name: &SessionName,
    harness: Harness,
) -> Result<Session, Error> {
    let transaction = connection.transaction().map_err(database_error)?;
    let owner = agents::get_by_name(&transaction, agent)?;
    if owner.agent.metadata.deletion_timestamp.is_some() {
        return Err(Error::Conflict);
    }
    let agent_id = owner.id;
    if let Some(session) = query_named(&transaction, agent_id, name)? {
        if session.harness != harness {
            return Err(Error::Invalid(format!(
                "Session {name:?} already uses harness {:?}, not {:?}",
                session.harness.as_str(),
                harness.as_str()
            )));
        }
        transaction.commit().map_err(database_error)?;
        return Ok(session);
    }
    let id = SessionId::generate();
    let created_at = time::OffsetDateTime::now_utc().unix_timestamp();
    transaction
        .execute(
            "INSERT INTO sessions (id, agent_id, name, harness, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                id.to_string(),
                agent_id.to_string(),
                name.as_str(),
                harness.as_str(),
                created_at
            ],
        )
        .map_err(database_error)?;
    let session = query_named(&transaction, agent_id, name)?.ok_or(Error::NotFound)?;
    transaction.commit().map_err(database_error)?;
    Ok(session)
}

pub(super) fn get(connection: &Connection, id: SessionId) -> Result<Session, Error> {
    connection
        .query_row(
            &format!(
                "SELECT {SESSION_COLUMNS} FROM sessions JOIN agents ON agents.id = sessions.agent_id \
                 WHERE sessions.id = ?1 AND agents.active_name IS NOT NULL"
            ),
            [id.to_string()],
            decode_row,
        )
        .optional()
        .map_err(database_error)?
        .ok_or(Error::NotFound)
}

pub(super) fn get_by_name(connection: &Connection, agent: &str, name: &SessionName) -> Result<Session, Error> {
    let owner = agents::get_by_name(connection, agent)?;
    query_named(connection, owner.id, name)?.ok_or(Error::NotFound)
}

pub(super) fn list_all(connection: &Connection) -> Result<Vec<Session>, Error> {
    query_many(
        connection,
        &format!(
            "SELECT {SESSION_COLUMNS} FROM sessions JOIN agents ON agents.id = sessions.agent_id \
             WHERE agents.active_name IS NOT NULL ORDER BY agents.active_name, sessions.name"
        ),
        [],
    )
}

pub(super) fn list_for_agent(connection: &Connection, agent: &str) -> Result<Vec<Session>, Error> {
    query_many(
        connection,
        &format!(
            "SELECT {SESSION_COLUMNS} FROM sessions JOIN agents ON agents.id = sessions.agent_id \
             WHERE agents.active_name = ?1 ORDER BY sessions.name"
        ),
        [agent],
    )
}

pub(super) fn activate(connection: &Connection, id: SessionId) -> Result<u64, Error> {
    let changed = connection
        .execute(
            "UPDATE sessions SET activation_generation = activation_generation + 1 WHERE id = ?1",
            [id.to_string()],
        )
        .map_err(database_error)?;
    if changed != 1 {
        return Err(Error::NotFound);
    }
    connection
        .query_row(
            "SELECT activation_generation FROM sessions WHERE id = ?1",
            [id.to_string()],
            |row| {
                let generation = row.get::<_, i64>(0)?;
                u64::try_from(generation).map_err(conversion_error)
            },
        )
        .map_err(database_error)
}

pub(super) fn update_status(
    connection: &Connection,
    id: SessionId,
    status: Status,
    observed_activation_generation: u64,
) -> Result<(), Error> {
    let lifecycle = Lifecycle {
        state: status.state,
        failure: status.failure,
        observed_activation_generation,
    };
    let changed = connection
        .execute(
            "UPDATE sessions SET lifecycle_json = ?1 WHERE id = ?2",
            params![serde_json::to_string(&lifecycle)?, id.to_string()],
        )
        .map_err(database_error)?;
    if changed == 1 { Ok(()) } else { Err(Error::NotFound) }
}

pub(super) fn set_native_session_id(connection: &Connection, id: SessionId, native: Option<&str>) -> Result<(), Error> {
    let changed = connection
        .execute(
            "UPDATE sessions SET harness_native_id = ?1 WHERE id = ?2",
            params![native, id.to_string()],
        )
        .map_err(database_error)?;
    if changed == 1 { Ok(()) } else { Err(Error::NotFound) }
}

pub(super) fn set_native_session_id_for_launch(
    connection: &Connection,
    id: SessionId,
    token: &LaunchToken,
    native: &str,
) -> Result<(), Error> {
    let changed = connection
        .execute(
            "UPDATE sessions SET harness_native_id = ?1
             WHERE id = ?2 AND launch_token = ?3
             AND EXISTS (
                 SELECT 1 FROM agents
                 WHERE agents.id = sessions.agent_id AND agents.active_name IS NOT NULL
             )",
            params![native, id.to_string(), token.expose()],
        )
        .map_err(database_error)?;
    if changed == 1 { Ok(()) } else { Err(Error::NotFound) }
}

pub(super) fn record_launch(
    connection: &Connection,
    id: SessionId,
    token: &LaunchToken,
    sandbox: &str,
    launched_at: i64,
    attempts: u32,
) -> Result<(), Error> {
    let changed = connection
        .execute(
            "UPDATE sessions SET launch_token = ?1, launch_sandbox = ?2, launched_at = ?3, launch_attempts = ?4 \
             WHERE id = ?5",
            params![token.expose(), sandbox, launched_at, attempts, id.to_string()],
        )
        .map_err(database_error)?;
    if changed == 1 { Ok(()) } else { Err(Error::NotFound) }
}

pub(super) fn launch_state(connection: &Connection, id: SessionId) -> Result<Option<LaunchState>, Error> {
    connection
        .query_row(
            "SELECT launch_sandbox, launched_at, launch_attempts FROM sessions WHERE id = ?1",
            [id.to_string()],
            |row| {
                let sandbox = row.get::<_, Option<String>>(0)?;
                let launched_at = row.get::<_, Option<i64>>(1)?;
                let attempts = row.get::<_, u32>(2)?;
                Ok(sandbox.zip(launched_at).map(|(sandbox, launched_at)| LaunchState {
                    sandbox,
                    launched_at,
                    attempts,
                }))
            },
        )
        .optional()
        .map_err(database_error)?
        .ok_or(Error::NotFound)
}

pub(super) fn reset_launch_attempts(connection: &Connection, id: SessionId) -> Result<(), Error> {
    let changed = connection
        .execute(
            "UPDATE sessions SET launch_attempts = 0 WHERE id = ?1",
            [id.to_string()],
        )
        .map_err(database_error)?;
    if changed == 1 { Ok(()) } else { Err(Error::NotFound) }
}

pub(super) fn attach_target(connection: &Connection, id: SessionId) -> Result<AttachTarget, Error> {
    let session = get(connection, id)?;
    if session.status.state != State::Running {
        return Err(Error::Invalid(format!("Session {} is not ready", session.id)));
    }
    let agent = agents::get(connection, session.agent_id)?;
    let ready = agent
        .agent
        .status
        .conditions
        .iter()
        .any(|condition| condition.kind == "Ready" && condition.status == ConditionStatus::True);
    let Some(sandbox @ Assignment::Materialized { .. }) = agent.agent.status.sandbox else {
        return Err(Error::Invalid(format!(
            "Agent {:?} is not ready",
            agent.agent.metadata.name
        )));
    };
    if !ready || agent.agent.metadata.deletion_timestamp.is_some() {
        return Err(Error::Invalid(format!(
            "Agent {:?} is not ready",
            agent.agent.metadata.name
        )));
    }
    Ok(AttachTarget { session, sandbox })
}

fn query_named(connection: &Connection, agent: AgentId, name: &SessionName) -> Result<Option<Session>, Error> {
    connection
        .query_row(
            &format!(
                "SELECT {SESSION_COLUMNS} FROM sessions JOIN agents ON agents.id = sessions.agent_id \
                 WHERE sessions.agent_id = ?1 AND sessions.name = ?2 AND agents.active_name IS NOT NULL"
            ),
            params![agent.to_string(), name.as_str()],
            decode_row,
        )
        .optional()
        .map_err(database_error)
}

fn query_many<P>(connection: &Connection, sql: &str, params: P) -> Result<Vec<Session>, Error>
where
    P: rusqlite::Params,
{
    let mut statement = connection.prepare(sql).map_err(database_error)?;
    statement
        .query_map(params, decode_row)
        .map_err(database_error)?
        .map(|row| row.map_err(database_error))
        .collect()
}

fn decode_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Session> {
    let id = row.get::<_, String>(0)?.parse().map_err(conversion_error)?;
    let agent_id = row.get::<_, String>(1)?.parse().map_err(conversion_error)?;
    let agent = row.get::<_, String>(2)?;
    let name = SessionName::new(row.get::<_, String>(3)?).map_err(conversion_error)?;
    let harness = row.get::<_, String>(4)?.parse().map_err(conversion_error)?;
    let created_at = time::OffsetDateTime::from_unix_timestamp(row.get::<_, i64>(5)?).map_err(conversion_error)?;
    let activation_generation = u64::try_from(row.get::<_, i64>(6)?).map_err(conversion_error)?;
    let lifecycle = serde_json::from_str::<Lifecycle>(&row.get::<_, String>(7)?).map_err(conversion_error)?;
    let harness_session_id = row.get::<_, Option<String>>(8)?;
    Ok(Session {
        id,
        agent_id,
        agent,
        name,
        harness,
        created_at,
        status: Status {
            state: lifecycle.state,
            failure: lifecycle.failure,
            harness_session_id,
        },
        activation_generation,
        observed_activation_generation: lifecycle.observed_activation_generation,
    })
}

fn conversion_error(error: impl std::error::Error + Send + Sync + 'static) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(error))
}
