//! Clean-slate `SQLite` schema initialization.

use rusqlite::{Connection, OptionalExtension as _};

use crate::Error;

use super::database_error;

const VERSION: u32 = 1;

const SQL: &str = "
    CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY NOT NULL,
        active_name TEXT UNIQUE,
        source_directory TEXT NOT NULL,
        desired_json TEXT NOT NULL,
        deletion_timestamp INTEGER,
        status_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS secrets (
        name TEXT PRIMARY KEY NOT NULL,
        value BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS provider_accounts (
        provider TEXT PRIMARY KEY NOT NULL,
        metadata_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
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

pub(super) fn initialize(connection: &Connection) -> Result<(), Error> {
    let version = connection
        .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
        .map_err(database_error)?;
    if table_exists(connection, "agents")? && version != VERSION {
        return Err(Error::Database(format!(
            "Agent database schema {version} is incompatible with schema {VERSION}; purge the Agent home before installing this build"
        )));
    }
    connection.execute_batch(SQL).map_err(database_error)
}

fn table_exists(connection: &Connection, table: &str) -> Result<bool, Error> {
    connection
        .query_row(
            "SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?1",
            [table],
            |_| Ok(()),
        )
        .optional()
        .map(|row| row.is_some())
        .map_err(database_error)
}
