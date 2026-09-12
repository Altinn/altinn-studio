//! Ordered, transactional `SQLite` schema migrations.

use std::collections::{BTreeMap, BTreeSet};

use rusqlite::{Connection, Transaction};

use crate::Error;

use super::database_error;

pub(crate) const VERSION: u32 = 2;

const PREVIEW_1_SQL: &str = "
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
";

const SESSION_COLUMNS_SQL: &str = "
    ALTER TABLE sessions ADD COLUMN initial_prompt TEXT;
    ALTER TABLE sessions ADD COLUMN harness_transcript_path TEXT;
    ALTER TABLE sessions ADD COLUMN activity_json TEXT NOT NULL DEFAULT '{}';
";

const SESSION_ACTIVITY_REPORTS_SQL: &str = "
    CREATE TABLE IF NOT EXISTS session_activity_reports (
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        launch_token TEXT NOT NULL,
        event_id TEXT NOT NULL,
        PRIMARY KEY (session_id, launch_token, event_id)
    );
";

struct Migration {
    version: u32,
    name: &'static str,
    schema: &'static [&'static str],
    apply: fn(&Transaction<'_>) -> Result<(), Error>,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "preview 1 baseline",
        schema: &[PREVIEW_1_SQL],
        apply: create_preview_1,
    },
    Migration {
        version: 2,
        name: "session management",
        schema: &[SESSION_COLUMNS_SQL, SESSION_ACTIVITY_REPORTS_SQL],
        apply: add_session_management,
    },
];

pub(super) fn initialize(connection: &mut Connection) -> Result<(), Error> {
    let current = schema_version(connection)?;
    if current > VERSION {
        return Err(Error::Database(format!(
            "Agent database schema {current} is newer than the supported schema {VERSION}"
        )));
    }
    if current == 0 && !user_tables(connection)?.is_empty() {
        return Err(unknown_schema(0, "the database contains unversioned tables"));
    }
    if current == VERSION {
        return verify_schema(connection, VERSION);
    }

    apply_pending_migrations(connection, current, MIGRATIONS, VERSION)?;
    verify_schema(connection, VERSION)
}

fn apply_pending_migrations(
    connection: &mut Connection,
    current: u32,
    migrations: &[Migration],
    target: u32,
) -> Result<(), Error> {
    let transaction = connection.transaction().map_err(database_error)?;
    for migration in migrations.iter().filter(|migration| migration.version > current) {
        (migration.apply)(&transaction).map_err(|error| {
            Error::Database(format!(
                "failed to apply Agent database migration {} ({}): {error}",
                migration.version, migration.name
            ))
        })?;
    }
    transaction
        .pragma_update(None, "user_version", target)
        .map_err(database_error)?;
    transaction.commit().map_err(database_error)
}

pub(super) fn pending_version(connection: &Connection) -> Result<Option<u32>, Error> {
    let version = schema_version(connection)?;
    Ok((version > 0 && version < VERSION).then_some(version))
}

fn create_preview_1(transaction: &Transaction<'_>) -> Result<(), Error> {
    transaction.execute_batch(PREVIEW_1_SQL).map_err(database_error)
}

fn add_session_management(transaction: &Transaction<'_>) -> Result<(), Error> {
    if schema_difference(transaction, 2)?.is_none() {
        return migrate_agent_instructions(transaction);
    }
    if schema_difference(transaction, 1)?.is_some() {
        verify_intermediate_schema(transaction)?;
    }
    migrate_agent_instructions(transaction)?;
    transaction.execute_batch(SESSION_COLUMNS_SQL).map_err(database_error)?;
    transaction
        .execute_batch(SESSION_ACTIVITY_REPORTS_SQL)
        .map_err(database_error)
}

fn migrate_agent_instructions(transaction: &Transaction<'_>) -> Result<(), Error> {
    let rows = {
        let mut statement = transaction
            .prepare("SELECT id, desired_json FROM agents ORDER BY id")
            .map_err(database_error)?;
        statement
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
            .map_err(database_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(database_error)?
    };
    for (id, encoded) in rows {
        let mut desired: serde_json::Value = serde_json::from_str(&encoded).map_err(|error| {
            Error::Database(format!(
                "Agent {id} has invalid desired state during migration: {error}"
            ))
        })?;
        let spec = desired
            .get_mut("spec")
            .and_then(serde_json::Value::as_object_mut)
            .ok_or_else(|| Error::Database(format!("Agent {id} desired state has no object-valued spec")))?;
        let Some(instructions) = spec.get_mut("instructions") else {
            continue;
        };
        match instructions {
            serde_json::Value::Array(_) => continue,
            serde_json::Value::Null => *instructions = serde_json::Value::Array(Vec::new()),
            serde_json::Value::Object(_) => {
                *instructions = serde_json::Value::Array(vec![instructions.take()]);
            }
            _ => {
                return Err(Error::Database(format!(
                    "Agent {id} desired state has an unexpected preview 1 instructions value"
                )));
            }
        }
        transaction
            .execute(
                "UPDATE agents SET desired_json = ?1 WHERE id = ?2",
                rusqlite::params![serde_json::to_string(&desired)?, id],
            )
            .map_err(database_error)?;
    }
    Ok(())
}

fn schema_version(connection: &Connection) -> Result<u32, Error> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(database_error)
}

fn verify_schema(connection: &Connection, version: u32) -> Result<(), Error> {
    schema_difference(connection, version)?.map_or(Ok(()), |detail| Err(unknown_schema(version, &detail)))
}

fn schema_difference(connection: &Connection, version: u32) -> Result<Option<String>, Error> {
    let statements = MIGRATIONS
        .iter()
        .filter(|migration| migration.version <= version)
        .flat_map(|migration| migration.schema.iter().copied())
        .collect::<Vec<_>>();
    schema_difference_with(connection, &statements)
}

fn verify_intermediate_schema(connection: &Connection) -> Result<(), Error> {
    schema_difference_with(connection, &[PREVIEW_1_SQL, SESSION_ACTIVITY_REPORTS_SQL])?
        .map_or(Ok(()), |detail| Err(unknown_schema(1, &detail)))
}

fn schema_difference_with(connection: &Connection, statements: &[&str]) -> Result<Option<String>, Error> {
    let expected = Connection::open_in_memory().map_err(database_error)?;
    for sql in statements {
        expected.execute_batch(sql).map_err(database_error)?;
    }
    let actual_tables = user_tables(connection)?;
    let expected_tables = user_tables(&expected)?;
    if actual_tables != expected_tables {
        return Ok(Some(format!(
            "expected tables {expected_tables:?}, found {actual_tables:?}"
        )));
    }
    for table in expected_tables {
        let actual = inspect_table(connection, &table)?;
        if actual != inspect_table(&expected, &table)? {
            return Ok(Some(format!("table {table:?} has an unexpected definition")));
        }
    }
    Ok(None)
}

fn user_tables(connection: &Connection) -> Result<BTreeSet<String>, Error> {
    let mut statement = connection
        .prepare(
            "SELECT name FROM sqlite_schema \
             WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .map_err(database_error)?;
    statement
        .query_map([], |row| row.get(0))
        .map_err(database_error)?
        .collect::<Result<_, _>>()
        .map_err(database_error)
}

#[derive(Debug, Eq, PartialEq)]
struct TableDefinition {
    columns: BTreeMap<String, ColumnDefinition>,
    unique_keys: Vec<Vec<String>>,
    foreign_keys: Vec<ForeignKeyDefinition>,
}

#[derive(Debug, Eq, PartialEq)]
struct ColumnDefinition {
    declared_type: String,
    not_null: bool,
    default: Option<String>,
    primary_key_position: u32,
}

#[derive(Debug, Eq, Ord, PartialEq, PartialOrd)]
struct ForeignKeyDefinition {
    table: String,
    from: String,
    to: String,
    on_update: String,
    on_delete: String,
}

fn inspect_table(connection: &Connection, table: &str) -> Result<TableDefinition, Error> {
    let columns = {
        let mut statement = connection
            .prepare(&format!("PRAGMA table_info({table})"))
            .map_err(database_error)?;
        statement
            .query_map([], |row| {
                Ok((
                    row.get(1)?,
                    ColumnDefinition {
                        declared_type: row.get(2)?,
                        not_null: row.get::<_, u32>(3)? != 0,
                        default: row.get(4)?,
                        primary_key_position: row.get(5)?,
                    },
                ))
            })
            .map_err(database_error)?
            .collect::<Result<BTreeMap<_, _>, _>>()
            .map_err(database_error)?
    };
    let unique_keys = inspect_unique_keys(connection, table)?;
    let foreign_keys = {
        let mut statement = connection
            .prepare(&format!("PRAGMA foreign_key_list({table})"))
            .map_err(database_error)?;
        let mut keys = statement
            .query_map([], |row| {
                Ok(ForeignKeyDefinition {
                    table: row.get(2)?,
                    from: row.get(3)?,
                    to: row.get(4)?,
                    on_update: row.get(5)?,
                    on_delete: row.get(6)?,
                })
            })
            .map_err(database_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(database_error)?;
        keys.sort();
        keys
    };
    Ok(TableDefinition {
        columns,
        unique_keys,
        foreign_keys,
    })
}

fn inspect_unique_keys(connection: &Connection, table: &str) -> Result<Vec<Vec<String>>, Error> {
    let indices = {
        let mut statement = connection
            .prepare(&format!("PRAGMA index_list({table})"))
            .map_err(database_error)?;
        statement
            .query_map([], |row| Ok((row.get::<_, String>(1)?, row.get::<_, u32>(2)? != 0)))
            .map_err(database_error)?
            .filter_map(|row| match row {
                Ok((name, true)) => Some(Ok(name)),
                Ok((_, false)) => None,
                Err(error) => Some(Err(error)),
            })
            .collect::<Result<Vec<_>, _>>()
            .map_err(database_error)?
    };
    let mut keys = Vec::with_capacity(indices.len());
    for index in indices {
        let escaped = index.replace('"', "\"\"");
        let mut statement = connection
            .prepare(&format!("PRAGMA index_info(\"{escaped}\")"))
            .map_err(database_error)?;
        keys.push(
            statement
                .query_map([], |row| row.get(2))
                .map_err(database_error)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(database_error)?,
        );
    }
    keys.sort();
    Ok(keys)
}

fn unknown_schema(version: u32, detail: &str) -> Error {
    Error::Database(format!(
        "Agent database schema {version} is not a recognized released schema: {detail}; select a new AGENT_HOME or restore a supported backup"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_first(transaction: &Transaction<'_>) -> Result<(), Error> {
        transaction
            .execute_batch("CREATE TABLE first (id INTEGER PRIMARY KEY);")
            .map_err(database_error)
    }

    fn fail_second(_transaction: &Transaction<'_>) -> Result<(), Error> {
        Err(Error::Database("injected second migration failure".into()))
    }

    fn create_third(transaction: &Transaction<'_>) -> Result<(), Error> {
        transaction
            .execute_batch("CREATE TABLE third (id INTEGER PRIMARY KEY);")
            .map_err(database_error)
    }

    #[test]
    fn all_pending_migrations_roll_back_together() {
        let mut connection = Connection::open_in_memory().expect("database");
        let migrations = [
            Migration {
                version: 1,
                name: "first",
                schema: &[],
                apply: create_first,
            },
            Migration {
                version: 2,
                name: "failure",
                schema: &[],
                apply: fail_second,
            },
        ];

        let error = apply_pending_migrations(&mut connection, 0, &migrations, 2).expect_err("second migration fails");

        assert!(error.to_string().contains("injected second migration failure"));
        assert_eq!(schema_version(&connection).expect("schema version"), 0);
        assert!(user_tables(&connection).expect("tables").is_empty());
    }

    #[test]
    fn expanded_version_1_continues_through_later_migrations() {
        let mut connection = Connection::open_in_memory().expect("database");
        connection.execute_batch(PREVIEW_1_SQL).expect("preview 1 schema");
        connection
            .execute_batch(SESSION_COLUMNS_SQL)
            .expect("expanded Session columns");
        connection
            .execute_batch(SESSION_ACTIVITY_REPORTS_SQL)
            .expect("expanded reports table");
        connection.pragma_update(None, "user_version", 1).expect("version 1");
        let migrations = [
            Migration {
                version: 2,
                name: "session management",
                schema: &[SESSION_COLUMNS_SQL, SESSION_ACTIVITY_REPORTS_SQL],
                apply: add_session_management,
            },
            Migration {
                version: 3,
                name: "third",
                schema: &["CREATE TABLE third (id INTEGER PRIMARY KEY);"],
                apply: create_third,
            },
        ];

        apply_pending_migrations(&mut connection, 1, &migrations, 3).expect("migrations");

        assert_eq!(schema_version(&connection).expect("schema version"), 3);
        assert!(user_tables(&connection).expect("tables").contains("third"));
    }
}
