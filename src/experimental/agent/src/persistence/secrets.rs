//! Host-owned secret and provider-account persistence.

use std::collections::BTreeSet;

use rusqlite::{Connection, OptionalExtension as _, params};

use crate::{AgentId, Error};

use super::{ProviderAccountWrite, StoredSecret, agent_secret_name, agent_secret_prefix, database_error};

pub(super) fn set_secret(connection: &Connection, name: &str, value: &[u8]) -> Result<(), Error> {
    connection
        .execute(
            "INSERT INTO secrets (name, value) VALUES (?1, ?2)
             ON CONFLICT(name) DO UPDATE SET value = excluded.value",
            params![name, value],
        )
        .map(|_| ())
        .map_err(database_error)
}

pub(super) fn resolve_secret(
    connection: &Connection,
    name: &str,
) -> Result<sandbox::secret_store::SecretMaterial, Error> {
    connection
        .query_row("SELECT value FROM secrets WHERE name = ?1", [name], |row| {
            row.get::<_, Vec<u8>>(0)
        })
        .optional()
        .map_err(database_error)?
        .map(sandbox::secret_store::SecretMaterial::new)
        .ok_or(Error::NotFound)
}

pub(super) fn replace_agent_secrets(
    connection: &mut Connection,
    id: AgentId,
    secrets: &[StoredSecret],
) -> Result<(), Error> {
    let transaction = connection.transaction().map_err(database_error)?;
    let mut desired = BTreeSet::new();
    for secret in secrets {
        let name = agent_secret_name(id, &secret.name);
        if !desired.insert(name.clone()) {
            return Err(Error::Invalid(format!("duplicate Agent secret {:?}", secret.name)));
        }
        set_secret(&transaction, &name, &secret.value)?;
    }

    let prefix = agent_secret_prefix(id);
    let existing = {
        let mut statement = transaction
            .prepare("SELECT name FROM secrets WHERE substr(name, 1, length(?1)) = ?1")
            .map_err(database_error)?;
        statement
            .query_map([&prefix], |row| row.get::<_, String>(0))
            .map_err(database_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(database_error)?
    };
    for name in existing {
        if !desired.contains(&name) {
            transaction
                .execute("DELETE FROM secrets WHERE name = ?1", [&name])
                .map_err(database_error)?;
        }
    }
    transaction.commit().map_err(database_error)
}

pub(super) fn delete_agent_secrets(connection: &Connection, id: AgentId) -> Result<(), Error> {
    let prefix = agent_secret_prefix(id);
    connection
        .execute("DELETE FROM secrets WHERE substr(name, 1, length(?1)) = ?1", [&prefix])
        .map(|_| ())
        .map_err(database_error)
}

pub(super) fn put_provider_account(connection: &mut Connection, account: &ProviderAccountWrite) -> Result<(), Error> {
    let transaction = connection.transaction().map_err(database_error)?;
    for credential in &account.credentials {
        set_secret(&transaction, &credential.name, &credential.value)?;
    }
    transaction
        .execute(
            "INSERT INTO provider_accounts (provider, metadata_json) VALUES (?1, ?2)
             ON CONFLICT(provider) DO UPDATE SET metadata_json = excluded.metadata_json",
            params![account.provider, account.metadata_json],
        )
        .map_err(database_error)?;
    transaction.commit().map_err(database_error)
}

pub(super) fn provider_account_exists(connection: &Connection, provider: &str) -> Result<bool, Error> {
    connection
        .query_row(
            "SELECT 1 FROM provider_accounts WHERE provider = ?1",
            [provider],
            |_| Ok(()),
        )
        .optional()
        .map(|row| row.is_some())
        .map_err(database_error)
}

pub(super) fn provider_account_metadata(connection: &Connection, provider: &str) -> Result<Option<String>, Error> {
    connection
        .query_row(
            "SELECT metadata_json FROM provider_accounts WHERE provider = ?1",
            [provider],
            |row| row.get(0),
        )
        .optional()
        .map_err(database_error)
}
