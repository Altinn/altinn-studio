//! Persistent local control-plane state owned by one dedicated `SQLite` thread.

use std::{path::Path, thread};

use rusqlite::Connection;
use tokio::sync::oneshot;
use zeroize::Zeroizing;

use crate::{AgentId, Error, Status, control_plane::AgentRecord, local::home};

mod agents;
mod schema;
mod secrets;
mod sessions;

/// Persistent Agent store backed by the shared control-plane database owner.
#[derive(Clone)]
pub struct Database {
    sender: tokio::sync::mpsc::Sender<Command>,
}

pub(crate) struct ProviderAccountWrite {
    pub(crate) provider: String,
    pub(crate) credentials: Vec<StoredSecret>,
    pub(crate) metadata_json: String,
}

pub(crate) struct StoredSecret {
    pub(crate) name: String,
    pub(crate) value: Zeroizing<Vec<u8>>,
}

impl Database {
    /// Opens a compatible database, then starts its dedicated owner thread.
    ///
    /// Call this during daemon startup, before entering the local async runtime.
    ///
    /// # Errors
    ///
    /// Returns an error when the database cannot be created, secured, or its
    /// schema does not match this build.
    pub fn open(path: &Path) -> Result<Self, Error> {
        let (sender, mut receiver) = tokio::sync::mpsc::channel(256);
        let (ready_sender, ready_receiver) = std::sync::mpsc::sync_channel(1);
        let path = path.to_path_buf();
        thread::Builder::new()
            .name("agent-database".into())
            .spawn(move || database_thread(&path, &mut receiver, &ready_sender))
            .map_err(Error::Io)?;
        ready_receiver
            .recv()
            .map_err(|_| Error::Database("database thread stopped during startup".into()))??;
        Ok(Self { sender })
    }

    async fn request<T>(&self, build: impl FnOnce(oneshot::Sender<Result<T, Error>>) -> Command) -> Result<T, Error> {
        let (response, receiver) = oneshot::channel();
        self.sender
            .send(build(response))
            .await
            .map_err(|_| Error::Database("database thread stopped".into()))?;
        receiver
            .await
            .map_err(|_| Error::Database("database thread dropped a response".into()))?
    }

    pub(crate) async fn put_provider_account(&self, account: ProviderAccountWrite) -> Result<(), Error> {
        self.request(|response| Command::PutProviderAccount { account, response })
            .await
    }

    pub(crate) async fn replace_agent_secrets(
        &self,
        id: AgentId,
        secrets: Vec<StoredSecret>,
    ) -> Result<Vec<sandbox::secret_store::SecretReference>, Error> {
        let references = secrets
            .iter()
            .map(|secret| sandbox::secret_store::SecretReference::from_opaque(agent_secret_name(id, &secret.name)))
            .collect();
        self.request(|response| Command::ReplaceAgentSecrets { id, secrets, response })
            .await?;
        Ok(references)
    }

    pub(crate) async fn provider_account_exists(&self, provider: &str) -> Result<bool, Error> {
        self.request(|response| Command::ProviderAccountExists {
            provider: provider.into(),
            response,
        })
        .await
    }

    pub(crate) async fn provider_account_metadata(&self, provider: &str) -> Result<Option<String>, Error> {
        self.request(|response| Command::ProviderAccountMetadata {
            provider: provider.into(),
            response,
        })
        .await
    }
}

impl crate::sessions::SessionStore for Database {
    fn ensure_session<'a>(
        &'a self,
        agent: &'a str,
        name: &'a crate::sessions::SessionName,
        harness: crate::Harness,
    ) -> sandbox::LocalFuture<'a, Result<crate::sessions::Session, Error>> {
        Box::pin(async move {
            self.request(|response| Command::EnsureSession {
                agent: agent.into(),
                name: name.clone(),
                harness,
                response,
            })
            .await
        })
    }

    fn get_session(
        &self,
        id: crate::sessions::SessionId,
    ) -> sandbox::LocalFuture<'_, Result<crate::sessions::Session, Error>> {
        Box::pin(async move { self.request(|response| Command::GetSession { id, response }).await })
    }

    fn get_agent_session<'a>(
        &'a self,
        agent: &'a str,
        name: &'a crate::sessions::SessionName,
    ) -> sandbox::LocalFuture<'a, Result<crate::sessions::Session, Error>> {
        Box::pin(async move {
            self.request(|response| Command::GetSessionByName {
                agent: agent.into(),
                name: name.clone(),
                response,
            })
            .await
        })
    }

    fn list_all_sessions(&self) -> sandbox::LocalFuture<'_, Result<Vec<crate::sessions::Session>, Error>> {
        Box::pin(async move { self.request(|response| Command::ListAllSessions { response }).await })
    }

    fn list_agent_sessions<'a>(
        &'a self,
        agent: &'a str,
    ) -> sandbox::LocalFuture<'a, Result<Vec<crate::sessions::Session>, Error>> {
        Box::pin(async move {
            self.request(|response| Command::ListSessions {
                agent: agent.into(),
                response,
            })
            .await
        })
    }

    fn update_session_status(
        &self,
        id: crate::sessions::SessionId,
        status: crate::sessions::Status,
        observed_activation_generation: u64,
    ) -> sandbox::LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.request(|response| Command::UpdateSessionStatus {
                id,
                status,
                observed_activation_generation,
                response,
            })
            .await
        })
    }

    fn activate_session(&self, id: crate::sessions::SessionId) -> sandbox::LocalFuture<'_, Result<u64, Error>> {
        Box::pin(async move { self.request(|response| Command::ActivateSession { id, response }).await })
    }

    fn session_attach_target(
        &self,
        id: crate::sessions::SessionId,
    ) -> sandbox::LocalFuture<'_, Result<crate::sessions::AttachTarget, Error>> {
        Box::pin(async move { self.request(|response| Command::GetAttachTarget { id, response }).await })
    }

    fn set_session_native_id(
        &self,
        id: crate::sessions::SessionId,
        native: Option<String>,
    ) -> sandbox::LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.request(|response| Command::SetSessionNativeId { id, native, response })
                .await
        })
    }

    fn set_session_native_id_for_launch<'a>(
        &'a self,
        id: crate::sessions::SessionId,
        token: &'a crate::sessions::LaunchToken,
        native: &'a str,
    ) -> sandbox::LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.request(|response| Command::SetSessionNativeIdForLaunch {
                id,
                token: token.clone(),
                native: native.into(),
                response,
            })
            .await
        })
    }

    fn record_session_launch(
        &self,
        id: crate::sessions::SessionId,
        launch: crate::sessions::LaunchRecord,
    ) -> sandbox::LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.request(|response| Command::RecordSessionLaunch {
                id,
                token: launch.token,
                sandbox: launch.sandbox,
                launched_at: launch.launched_at,
                attempts: launch.attempts,
                response,
            })
            .await
        })
    }

    fn session_launch_state(
        &self,
        id: crate::sessions::SessionId,
    ) -> sandbox::LocalFuture<'_, Result<Option<crate::sessions::LaunchState>, Error>> {
        Box::pin(async move {
            self.request(|response| Command::GetSessionLaunchState { id, response })
                .await
        })
    }

    fn reset_session_launch_attempts(
        &self,
        id: crate::sessions::SessionId,
    ) -> sandbox::LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.request(|response| Command::ResetSessionLaunchAttempts { id, response })
                .await
        })
    }
}

impl crate::control_plane::AgentStore for Database {
    fn get(&self, id: AgentId) -> sandbox::LocalFuture<'_, Result<AgentRecord, Error>> {
        Box::pin(async move { self.request(|response| Command::Get { id, response }).await })
    }

    fn get_by_name<'a>(&'a self, name: &'a str) -> sandbox::LocalFuture<'a, Result<AgentRecord, Error>> {
        Box::pin(async move {
            self.request(|response| Command::GetByName {
                name: name.into(),
                response,
            })
            .await
        })
    }

    fn list(&self) -> sandbox::LocalFuture<'_, Result<Vec<AgentRecord>, Error>> {
        Box::pin(async move { self.request(|response| Command::List { response }).await })
    }

    fn put(&self, record: AgentRecord, expected_generation: u64) -> sandbox::LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.request(|response| Command::Put {
                record: Box::new(record),
                expected_generation,
                response,
            })
            .await
        })
    }

    fn update_status(
        &self,
        id: AgentId,
        generation: u64,
        status: Status,
    ) -> sandbox::LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.request(|response| Command::UpdateStatus {
                id,
                generation,
                status,
                response,
            })
            .await
        })
    }

    fn mark_deleting<'a>(&'a self, name: &'a str) -> sandbox::LocalFuture<'a, Result<AgentRecord, Error>> {
        Box::pin(async move {
            self.request(|response| Command::MarkDeleting {
                name: name.into(),
                response,
            })
            .await
        })
    }

    fn finalize_deletion(&self, id: AgentId, generation: u64) -> sandbox::LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.request(|response| Command::FinalizeDeletion {
                id,
                generation,
                response,
            })
            .await
        })
    }
}

impl sandbox::secret_store::SecretStore for Database {
    fn set<'a>(
        &'a self,
        name: &'a str,
        value: &'a [u8],
    ) -> sandbox::LocalFuture<'a, Result<sandbox::secret_store::SecretReference, sandbox::Error>> {
        Box::pin(async move {
            if name.is_empty() {
                return Err(sandbox::Error::invalid("secret.name", "must not be empty"));
            }
            let value = Zeroizing::new(value.to_vec());
            self.request(|response| Command::SetSecret {
                name: name.into(),
                value,
                response,
            })
            .await
            .map_err(secret_store_error)?;
            Ok(sandbox::secret_store::SecretReference::from_opaque(name))
        })
    }

    fn resolve<'a>(
        &'a self,
        reference: &'a sandbox::secret_store::SecretReference,
    ) -> sandbox::LocalFuture<'a, Result<sandbox::secret_store::SecretMaterial, sandbox::Error>> {
        Box::pin(async move {
            self.request(|response| Command::ResolveSecret {
                name: reference.as_str().into(),
                response,
            })
            .await
            .map_err(secret_store_error)
        })
    }
}

enum Command {
    Get {
        id: AgentId,
        response: oneshot::Sender<Result<AgentRecord, Error>>,
    },
    GetByName {
        name: String,
        response: oneshot::Sender<Result<AgentRecord, Error>>,
    },
    List {
        response: oneshot::Sender<Result<Vec<AgentRecord>, Error>>,
    },
    Put {
        record: Box<AgentRecord>,
        expected_generation: u64,
        response: oneshot::Sender<Result<(), Error>>,
    },
    UpdateStatus {
        id: AgentId,
        generation: u64,
        status: Status,
        response: oneshot::Sender<Result<(), Error>>,
    },
    MarkDeleting {
        name: String,
        response: oneshot::Sender<Result<AgentRecord, Error>>,
    },
    FinalizeDeletion {
        id: AgentId,
        generation: u64,
        response: oneshot::Sender<Result<(), Error>>,
    },
    SetSecret {
        name: String,
        value: Zeroizing<Vec<u8>>,
        response: oneshot::Sender<Result<(), Error>>,
    },
    ReplaceAgentSecrets {
        id: AgentId,
        secrets: Vec<StoredSecret>,
        response: oneshot::Sender<Result<(), Error>>,
    },
    ResolveSecret {
        name: String,
        response: oneshot::Sender<Result<sandbox::secret_store::SecretMaterial, Error>>,
    },
    PutProviderAccount {
        account: ProviderAccountWrite,
        response: oneshot::Sender<Result<(), Error>>,
    },
    ProviderAccountExists {
        provider: String,
        response: oneshot::Sender<Result<bool, Error>>,
    },
    ProviderAccountMetadata {
        provider: String,
        response: oneshot::Sender<Result<Option<String>, Error>>,
    },
    EnsureSession {
        agent: String,
        name: crate::sessions::SessionName,
        harness: crate::Harness,
        response: oneshot::Sender<Result<crate::sessions::Session, Error>>,
    },
    GetSession {
        id: crate::sessions::SessionId,
        response: oneshot::Sender<Result<crate::sessions::Session, Error>>,
    },
    GetSessionByName {
        agent: String,
        name: crate::sessions::SessionName,
        response: oneshot::Sender<Result<crate::sessions::Session, Error>>,
    },
    ListAllSessions {
        response: oneshot::Sender<Result<Vec<crate::sessions::Session>, Error>>,
    },
    ListSessions {
        agent: String,
        response: oneshot::Sender<Result<Vec<crate::sessions::Session>, Error>>,
    },
    UpdateSessionStatus {
        id: crate::sessions::SessionId,
        status: crate::sessions::Status,
        observed_activation_generation: u64,
        response: oneshot::Sender<Result<(), Error>>,
    },
    ActivateSession {
        id: crate::sessions::SessionId,
        response: oneshot::Sender<Result<u64, Error>>,
    },
    GetAttachTarget {
        id: crate::sessions::SessionId,
        response: oneshot::Sender<Result<crate::sessions::AttachTarget, Error>>,
    },
    SetSessionNativeId {
        id: crate::sessions::SessionId,
        native: Option<String>,
        response: oneshot::Sender<Result<(), Error>>,
    },
    SetSessionNativeIdForLaunch {
        id: crate::sessions::SessionId,
        token: crate::sessions::LaunchToken,
        native: String,
        response: oneshot::Sender<Result<(), Error>>,
    },
    RecordSessionLaunch {
        id: crate::sessions::SessionId,
        token: crate::sessions::LaunchToken,
        sandbox: String,
        launched_at: i64,
        attempts: u32,
        response: oneshot::Sender<Result<(), Error>>,
    },
    GetSessionLaunchState {
        id: crate::sessions::SessionId,
        response: oneshot::Sender<Result<Option<crate::sessions::LaunchState>, Error>>,
    },
    ResetSessionLaunchAttempts {
        id: crate::sessions::SessionId,
        response: oneshot::Sender<Result<(), Error>>,
    },
}

fn database_thread(
    path: &Path,
    receiver: &mut tokio::sync::mpsc::Receiver<Command>,
    ready: &std::sync::mpsc::SyncSender<Result<(), Error>>,
) {
    let connection = open(path);
    let Ok(mut connection) = connection else {
        let _ = ready.send(connection.map(|_| ()));
        return;
    };
    if ready.send(Ok(())).is_err() {
        return;
    }
    while let Some(command) = receiver.blocking_recv() {
        execute(&mut connection, command);
    }
}

fn open(path: &Path) -> Result<Connection, Error> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
        home::secure_directory(parent)?;
    }
    let connection = Connection::open(path).map_err(database_error)?;
    home::secure_file(path)?;
    connection
        .execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;")
        .map_err(database_error)?;
    schema::initialize(&connection)?;
    Ok(connection)
}

fn execute(connection: &mut Connection, command: Command) {
    match command {
        Command::Get { id, response } => {
            let _ = response.send(agents::get(connection, id));
        }
        Command::GetByName { name, response } => {
            let _ = response.send(agents::get_by_name(connection, &name));
        }
        Command::List { response } => {
            let _ = response.send(agents::list(connection));
        }
        Command::Put {
            record,
            expected_generation,
            response,
        } => {
            let _ = response.send(agents::put(connection, &record, expected_generation));
        }
        Command::UpdateStatus {
            id,
            generation,
            status,
            response,
        } => {
            let _ = response.send(agents::update_status(connection, id, generation, &status));
        }
        Command::MarkDeleting { name, response } => {
            let _ = response.send(agents::mark_deleting(connection, &name));
        }
        Command::FinalizeDeletion {
            id,
            generation,
            response,
        } => {
            let _ = response.send(agents::finalize_deletion(connection, id, generation));
        }
        Command::SetSecret { name, value, response } => {
            let _ = response.send(secrets::set_secret(connection, &name, &value));
        }
        Command::ReplaceAgentSecrets { id, secrets, response } => {
            let _ = response.send(secrets::replace_agent_secrets(connection, id, &secrets));
        }
        Command::ResolveSecret { name, response } => {
            let _ = response.send(secrets::resolve_secret(connection, &name));
        }
        Command::PutProviderAccount { account, response } => {
            let _ = response.send(secrets::put_provider_account(connection, &account));
        }
        Command::ProviderAccountExists { provider, response } => {
            let _ = response.send(secrets::provider_account_exists(connection, &provider));
        }
        Command::ProviderAccountMetadata { provider, response } => {
            let _ = response.send(secrets::provider_account_metadata(connection, &provider));
        }
        session_command => execute_session(connection, session_command),
    }
}

fn execute_session(connection: &mut Connection, command: Command) {
    match command {
        Command::EnsureSession {
            agent,
            name,
            harness,
            response,
        } => {
            let _ = response.send(sessions::ensure(connection, &agent, &name, harness));
        }
        Command::GetSession { id, response } => {
            let _ = response.send(sessions::get(connection, id));
        }
        Command::GetSessionByName { agent, name, response } => {
            let _ = response.send(sessions::get_by_name(connection, &agent, &name));
        }
        Command::ListAllSessions { response } => {
            let _ = response.send(sessions::list_all(connection));
        }
        Command::ListSessions { agent, response } => {
            let _ = response.send(sessions::list_for_agent(connection, &agent));
        }
        Command::UpdateSessionStatus {
            id,
            status,
            observed_activation_generation,
            response,
        } => {
            let _ = response.send(sessions::update_status(
                connection,
                id,
                status,
                observed_activation_generation,
            ));
        }
        Command::ActivateSession { id, response } => {
            let _ = response.send(sessions::activate(connection, id));
        }
        Command::GetAttachTarget { id, response } => {
            let _ = response.send(sessions::attach_target(connection, id));
        }
        Command::SetSessionNativeId { id, native, response } => {
            let _ = response.send(sessions::set_native_session_id(connection, id, native.as_deref()));
        }
        Command::SetSessionNativeIdForLaunch {
            id,
            token,
            native,
            response,
        } => {
            let _ = response.send(sessions::set_native_session_id_for_launch(
                connection, id, &token, &native,
            ));
        }
        Command::RecordSessionLaunch {
            id,
            token,
            sandbox,
            launched_at,
            attempts,
            response,
        } => {
            let _ = response.send(sessions::record_launch(
                connection,
                id,
                &token,
                &sandbox,
                launched_at,
                attempts,
            ));
        }
        Command::GetSessionLaunchState { id, response } => {
            let _ = response.send(sessions::launch_state(connection, id));
        }
        Command::ResetSessionLaunchAttempts { id, response } => {
            let _ = response.send(sessions::reset_launch_attempts(connection, id));
        }
        // Every non-Session command is matched exhaustively by `execute`.
        _ => unreachable!("non-Session command routed to the Session executor"),
    }
}

pub(super) fn database_error(error: rusqlite::Error) -> Error {
    let message = error.to_string();
    drop(error);
    Error::Database(message)
}

fn secret_store_error(error: Error) -> sandbox::Error {
    match error {
        Error::NotFound => sandbox::Error::not_found(sandbox::ResourceKind::Secret, "host secret"),
        other => sandbox::Error::Backend(other.to_string()),
    }
}

fn agent_secret_prefix(id: AgentId) -> String {
    format!("agent/{id}/")
}

fn agent_secret_name(id: AgentId, name: &str) -> String {
    format!("{}{name}", agent_secret_prefix(id))
}

#[cfg(test)]
mod tests {
    use sandbox::secret_store::{SecretReference, SecretStore as _};
    use tempfile::TempDir;
    use zeroize::Zeroizing;

    use super::{Database, StoredSecret, open};

    #[test]
    fn database_owner_enables_secure_deletion() {
        let directory = TempDir::new().expect("temporary directory");
        let connection = open(&directory.path().join("agent.db")).expect("database connection");

        assert_eq!(
            connection
                .query_row("PRAGMA secure_delete", [], |row| row.get::<_, u8>(0))
                .expect("secure-delete setting"),
            1
        );
    }

    #[tokio::test(flavor = "local")]
    async fn replacing_agent_secrets_prunes_stale_rows_without_touching_provider_credentials() {
        let directory = TempDir::new().expect("temporary directory");
        let database = Database::open(&directory.path().join("agent.db")).expect("database");
        let agent_id = "38f41de4-6ff7-4679-ae46-678bc61e4dcb".parse().expect("Agent ID");
        let github = SecretReference::from_opaque(format!("agent/{agent_id}/github-token"));
        let studio = SecretReference::from_opaque(format!("agent/{agent_id}/studio-token"));
        let provider = database
            .set("provider-access-token", b"provider-secret")
            .await
            .expect("provider secret");

        database
            .replace_agent_secrets(
                agent_id,
                vec![
                    StoredSecret {
                        name: "github-token".into(),
                        value: Zeroizing::new(b"github-secret".to_vec()),
                    },
                    StoredSecret {
                        name: "studio-token".into(),
                        value: Zeroizing::new(b"studio-secret".to_vec()),
                    },
                ],
            )
            .await
            .expect("initial Agent secrets");
        database
            .replace_agent_secrets(
                agent_id,
                vec![StoredSecret {
                    name: "studio-token".into(),
                    value: Zeroizing::new(b"rotated-studio-secret".to_vec()),
                }],
            )
            .await
            .expect("replacement Agent secrets");

        assert!(database.resolve(&github).await.is_err());
        assert_eq!(
            database.resolve(&studio).await.expect("retained secret").expose(),
            b"rotated-studio-secret"
        );
        assert_eq!(
            database.resolve(&provider).await.expect("provider secret").expose(),
            b"provider-secret"
        );
    }
}
