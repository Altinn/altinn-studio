//! Codex CLI host-side `ChatGPT` subscription authentication.

use std::{cell::RefCell, time::Instant, time::SystemTime};

use base64::Engine as _;
use sandbox::secret_store::{SecretMaterial, SecretReference, SecretStore as _};
use serde::{Deserialize, Serialize};
use tokio::sync::oneshot;
use zeroize::Zeroizing;

use crate::{Error, harness::ImportedAuthentication, persistence};

use super::{ACCESS_SECRET, ACCOUNT_SECRET, PROVIDER, REFRESH_SECRET};

const REFRESH_URL: &str = "https://auth.openai.com/oauth/token";
const OAUTH_CLIENT_ID: &str = "app_EMoamEEZ73f0CkXaXp7hrann";
const REFRESH_AHEAD_SECONDS: i64 = 5 * 60;
const TRANSIENT_FAILURE_COOLDOWN: std::time::Duration = std::time::Duration::from_secs(30);
const REQUEST_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);

type RefreshWaiter = oneshot::Sender<Result<(), String>>;

struct RefreshLeader<'a> {
    waiters: &'a RefCell<Option<Vec<RefreshWaiter>>>,
    finished: bool,
}

impl RefreshLeader<'_> {
    fn finish(mut self, result: &Result<(), RefreshFailure>) {
        let notification = match result {
            Ok(()) => Ok(()),
            Err(error) => Err(error.message().to_owned()),
        };
        self.finished = true;
        for waiter in self.waiters.borrow_mut().take().unwrap_or_default() {
            let _ = waiter.send(notification.clone());
        }
    }
}

impl Drop for RefreshLeader<'_> {
    fn drop(&mut self) {
        if !self.finished {
            for waiter in self.waiters.borrow_mut().take().unwrap_or_default() {
                let _ = waiter.send(Err("Codex token refresh was interrupted".into()));
            }
        }
    }
}

/// Owns a `ChatGPT` OAuth grant used only by the Agent stack.
pub(in crate::harness) struct Authentication {
    database: persistence::Database,
    client: reqwest::Client,
    refresh_url: String,
    refresh_waiters: RefCell<Option<Vec<RefreshWaiter>>>,
    refresh_failure: RefCell<Option<CachedRefreshFailure>>,
}

impl Authentication {
    #[must_use]
    pub(in crate::harness) fn new(database: persistence::Database) -> Self {
        Self {
            database,
            client: reqwest::Client::new(),
            refresh_url: REFRESH_URL.into(),
            refresh_waiters: RefCell::new(None),
            refresh_failure: RefCell::new(None),
        }
    }

    /// Imports the independent `ChatGPT` grant produced in agentctl's private Codex home.
    pub(in crate::harness) async fn login(
        &self,
        credential: Zeroizing<String>,
    ) -> Result<ImportedAuthentication, Error> {
        let source: LoginFile = serde_json::from_str(&credential)
            .map_err(|_| Error::Invalid("Codex login did not produce valid authentication data".into()))?;
        if source.auth_mode.as_deref() != Some("chatgpt") {
            return Err(Error::Invalid(
                "Codex login did not produce a ChatGPT subscription grant".into(),
            ));
        }
        let tokens = source
            .tokens
            .ok_or_else(|| Error::Invalid("Codex login did not produce ChatGPT tokens".into()))?;
        let access_token = Zeroizing::new(tokens.access_token.trim().to_owned());
        let refresh_token = Zeroizing::new(tokens.refresh_token.trim().to_owned());
        let account_id = tokens
            .account_id
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| Error::Invalid("Codex login did not identify a ChatGPT account".into()))?;
        if access_token.is_empty() || refresh_token.is_empty() {
            return Err(Error::Invalid("Codex login produced incomplete ChatGPT tokens".into()));
        }
        let metadata = CodexMetadata {
            kind: CredentialKind::ChatgptOauth,
            account_id,
            expires_at: jwt_expiry(&access_token)?,
        };
        self.store(&access_token, &refresh_token, &metadata).await?;
        self.refresh_failure.borrow_mut().take();
        Ok(ImportedAuthentication {
            provider: PROVIDER.into(),
            ready: true,
        })
    }

    pub(in crate::harness) async fn resolve_access(&self) -> Result<SecretMaterial, sandbox::Error> {
        self.refresh_if_needed()
            .await
            .map_err(|error| sandbox::Error::Backend(error.to_string()))?;
        self.database
            .resolve(&SecretReference::from_opaque(ACCESS_SECRET))
            .await
    }

    #[allow(clippy::option_if_let_else)]
    async fn refresh_if_needed(&self) -> Result<(), Error> {
        let metadata = self.metadata().await?;
        if metadata.expires_at > unix_time()?.saturating_add(REFRESH_AHEAD_SECONDS) {
            return Ok(());
        }
        if let Some(error) = self.cached_refresh_failure() {
            return Err(error);
        }

        let waiting = {
            let mut active = self.refresh_waiters.borrow_mut();
            if let Some(waiters) = active.as_mut() {
                let (sender, receiver) = oneshot::channel();
                waiters.push(sender);
                Some(receiver)
            } else {
                *active = Some(Vec::new());
                None
            }
        };
        if let Some(receiver) = waiting {
            return receiver
                .await
                .map_err(|_| Error::Invalid("Codex token refresh stopped unexpectedly".into()))?
                .map_err(Error::Invalid);
        }

        let leader = RefreshLeader {
            waiters: &self.refresh_waiters,
            finished: false,
        };
        let result = self.refresh(&metadata).await;
        match &result {
            Ok(()) => {
                self.refresh_failure.borrow_mut().take();
            }
            Err(failure) => {
                let cached = match failure {
                    RefreshFailure::Permanent(message) => CachedRefreshFailure::Permanent(message.clone()),
                    RefreshFailure::Transient(message) => CachedRefreshFailure::Transient {
                        message: message.clone(),
                        retry_at: Instant::now() + TRANSIENT_FAILURE_COOLDOWN,
                    },
                };
                *self.refresh_failure.borrow_mut() = Some(cached);
            }
        }
        leader.finish(&result);
        result.map_err(RefreshFailure::into_error)
    }

    fn cached_refresh_failure(&self) -> Option<Error> {
        let mut cached = self.refresh_failure.borrow_mut();
        match cached.as_ref() {
            Some(CachedRefreshFailure::Permanent(message)) => Some(Error::Invalid(message.clone())),
            Some(CachedRefreshFailure::Transient { message, retry_at }) if Instant::now() < *retry_at => {
                Some(Error::Invalid(message.clone()))
            }
            Some(CachedRefreshFailure::Transient { .. }) | None => {
                cached.take();
                None
            }
        }
    }

    async fn refresh(&self, metadata: &CodexMetadata) -> Result<(), RefreshFailure> {
        let stored = self
            .database
            .resolve(&SecretReference::from_opaque(REFRESH_SECRET))
            .await
            .map_err(|error| {
                RefreshFailure::permanent(format!(
                    "Codex refresh credential is unavailable: {error}; run `agentctl codex login` again"
                ))
            })?;
        let refresh_token = std::str::from_utf8(stored.expose()).map_err(|_| {
            RefreshFailure::permanent("Codex refresh credential is invalid; run `agentctl codex login` again")
        })?;
        let response = self
            .client
            .post(&self.refresh_url)
            .timeout(REQUEST_TIMEOUT)
            .json(&RefreshRequest {
                client_id: OAUTH_CLIENT_ID,
                grant_type: "refresh_token",
                refresh_token,
            })
            .send()
            .await
            .map_err(|_| RefreshFailure::transient("could not reach OpenAI to refresh Codex authentication"))?;
        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            let code = refresh_error_code(&body);
            let invalid_grant = status == reqwest::StatusCode::BAD_REQUEST
                && code
                    .as_deref()
                    .is_some_and(|code| code.eq_ignore_ascii_case("invalid_grant"));
            let permanent = status == reqwest::StatusCode::UNAUTHORIZED
                || invalid_grant
                || matches!(
                    code.as_deref(),
                    Some("refresh_token_expired" | "refresh_token_reused" | "refresh_token_invalidated")
                );
            if permanent {
                let reason = match code.as_deref() {
                    Some("refresh_token_expired") => "the refresh token has expired",
                    Some("refresh_token_reused") => "the refresh token was already used",
                    Some("refresh_token_invalidated") => "the refresh token was revoked",
                    _ => "OpenAI rejected the refresh grant",
                };
                return Err(RefreshFailure::permanent(format!(
                    "Codex authentication can no longer be refreshed because {reason}; run `agentctl codex login` again"
                )));
            }
            return Err(RefreshFailure::transient(format!(
                "OpenAI temporarily failed to refresh Codex authentication (HTTP {status})"
            )));
        }
        let response: RefreshResponse = response
            .json()
            .await
            .map_err(|_| RefreshFailure::transient("OpenAI returned an invalid Codex refresh response"))?;
        let access_token = Zeroizing::new(response.access_token.trim().to_owned());
        if access_token.is_empty() {
            return Err(RefreshFailure::transient("OpenAI returned an empty Codex access token"));
        }
        let refresh_token = Zeroizing::new(
            response
                .refresh_token
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or(refresh_token)
                .to_owned(),
        );
        let replacement = CodexMetadata {
            kind: CredentialKind::ChatgptOauth,
            account_id: metadata.account_id.clone(),
            expires_at: jwt_expiry(&access_token)
                .map_err(|_| RefreshFailure::transient("OpenAI returned an invalid Codex access token"))?,
        };
        self.store(&access_token, &refresh_token, &replacement)
            .await
            .map_err(|_| RefreshFailure::transient("could not store refreshed Codex authentication"))
    }

    async fn store(&self, access_token: &str, refresh_token: &str, metadata: &CodexMetadata) -> Result<(), Error> {
        self.database
            .put_provider_account(persistence::ProviderAccountWrite {
                provider: PROVIDER.into(),
                credentials: vec![
                    persistence::StoredSecret {
                        name: ACCESS_SECRET.into(),
                        value: Zeroizing::new(access_token.as_bytes().to_vec()),
                    },
                    persistence::StoredSecret {
                        name: REFRESH_SECRET.into(),
                        value: Zeroizing::new(refresh_token.as_bytes().to_vec()),
                    },
                    persistence::StoredSecret {
                        name: ACCOUNT_SECRET.into(),
                        value: Zeroizing::new(metadata.account_id.as_bytes().to_vec()),
                    },
                ],
                metadata_json: serde_json::to_string(metadata)?,
            })
            .await
    }

    async fn metadata(&self) -> Result<CodexMetadata, Error> {
        let metadata = self
            .database
            .provider_account_metadata(PROVIDER)
            .await?
            .ok_or_else(|| Error::Invalid("Codex authentication is not ready; run `agentctl codex login`".into()))?;
        serde_json::from_str(&metadata)
            .map_err(|_| Error::Invalid("stored Codex authentication metadata is invalid; log in again".into()))
    }

    #[cfg(test)]
    fn with_refresh_url(mut self, refresh_url: String) -> Self {
        self.refresh_url = refresh_url;
        self
    }
}

#[derive(Clone)]
enum RefreshFailure {
    Permanent(String),
    Transient(String),
}

impl RefreshFailure {
    fn permanent(message: impl Into<String>) -> Self {
        Self::Permanent(message.into())
    }

    fn transient(message: impl Into<String>) -> Self {
        Self::Transient(message.into())
    }

    fn message(&self) -> &str {
        match self {
            Self::Permanent(message) | Self::Transient(message) => message,
        }
    }

    fn into_error(self) -> Error {
        Error::Invalid(match self {
            Self::Permanent(message) | Self::Transient(message) => message,
        })
    }
}

enum CachedRefreshFailure {
    Permanent(String),
    Transient { message: String, retry_at: Instant },
}

#[derive(Deserialize)]
struct LoginFile {
    auth_mode: Option<String>,
    tokens: Option<LoginTokens>,
}

#[derive(Deserialize)]
struct LoginTokens {
    access_token: String,
    refresh_token: String,
    account_id: Option<String>,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
enum CredentialKind {
    ChatgptOauth,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CodexMetadata {
    kind: CredentialKind,
    account_id: String,
    expires_at: i64,
}

#[derive(Serialize)]
struct RefreshRequest<'a> {
    client_id: &'static str,
    grant_type: &'static str,
    refresh_token: &'a str,
}

#[derive(Deserialize)]
struct RefreshResponse {
    access_token: String,
    refresh_token: Option<String>,
}

fn refresh_error_code(body: &str) -> Option<String> {
    let value = serde_json::from_str::<serde_json::Value>(body).ok()?;
    let code = match value.get("error") {
        Some(serde_json::Value::String(code)) => Some(code.clone()),
        Some(serde_json::Value::Object(error)) => error.get("code")?.as_str().map(str::to_owned),
        _ => value.get("code")?.as_str().map(str::to_owned),
    }?;
    Some(code.to_ascii_lowercase())
}

fn jwt_expiry(token: &str) -> Result<i64, Error> {
    let encoded = token
        .split('.')
        .nth(1)
        .ok_or_else(|| Error::Invalid("Codex access token is not a JWT".into()))?;
    let payload = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(encoded)
        .map_err(|_| Error::Invalid("Codex access token has an invalid JWT payload".into()))?;
    let claims: JwtClaims = serde_json::from_slice(&payload)
        .map_err(|_| Error::Invalid("Codex access token has invalid JWT claims".into()))?;
    Ok(claims.exp)
}

fn unix_time() -> Result<i64, Error> {
    let seconds = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|_| Error::Invalid("host clock is before the Unix epoch".into()))?
        .as_secs();
    i64::try_from(seconds).map_err(|_| Error::Invalid("host clock cannot be represented".into()))
}

#[derive(Deserialize)]
struct JwtClaims {
    exp: i64,
}

pub(super) async fn is_ready(database: &persistence::Database) -> Result<bool, Error> {
    let Some(metadata) = database.provider_account_metadata(PROVIDER).await? else {
        return Ok(false);
    };
    if serde_json::from_str::<CodexMetadata>(&metadata).is_err() {
        return Ok(false);
    }
    Ok(database
        .resolve(&SecretReference::from_opaque(ACCESS_SECRET))
        .await
        .is_ok()
        && database
            .resolve(&SecretReference::from_opaque(REFRESH_SECRET))
            .await
            .is_ok()
        && database
            .resolve(&SecretReference::from_opaque(ACCOUNT_SECRET))
            .await
            .is_ok())
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use std::{cell::Cell, rc::Rc};

    use tempfile::TempDir;
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    use super::*;

    fn jwt(exp: i64) -> String {
        let payload =
            base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(serde_json::json!({ "exp": exp }).to_string());
        format!("header.{payload}.signature")
    }

    fn login_file(access_token: &str, refresh_token: &str) -> Zeroizing<String> {
        Zeroizing::new(
            serde_json::json!({
                "auth_mode": "chatgpt",
                "OPENAI_API_KEY": null,
                "tokens": {
                    "id_token": "header.payload.signature",
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "account_id": "account-canary"
                },
                "last_refresh": "2026-08-24T00:00:00Z"
            })
            .to_string(),
        )
    }

    async fn serve_refresh(access_token: String, refresh_token: Option<&'static str>) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind refresh endpoint");
        let endpoint = format!("http://{}/oauth/token", listener.local_addr().expect("local address"));
        tokio::task::spawn_local(async move {
            let (mut stream, _) = listener.accept().await.expect("accept");
            let mut request = [0_u8; 4_096];
            let read = stream.read(&mut request).await.expect("read request");
            let request = String::from_utf8_lossy(&request[..read]);
            assert!(request.contains("refresh-canary"));
            assert!(request.contains(OAUTH_CLIENT_ID));
            let body = serde_json::json!({
                "access_token": access_token,
                "refresh_token": refresh_token,
            })
            .to_string();
            stream
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await
                .expect("write response");
        });
        endpoint
    }

    async fn serve_refresh_failure(status: &str, body: &'static str) -> (String, Rc<Cell<usize>>) {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind refresh endpoint");
        let endpoint = format!("http://{}/oauth/token", listener.local_addr().expect("local address"));
        let requests = Rc::new(Cell::new(0));
        let observed = Rc::clone(&requests);
        let status = status.to_owned();
        tokio::task::spawn_local(async move {
            loop {
                let (mut stream, _) = listener.accept().await.expect("accept");
                let mut request = [0_u8; 4_096];
                let _read = stream.read(&mut request).await.expect("read request");
                observed.set(observed.get() + 1);
                stream
                    .write_all(
                        format!(
                            "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                            body.len()
                        )
                        .as_bytes(),
                    )
                    .await
                    .expect("write response");
            }
        });
        (endpoint, requests)
    }

    #[tokio::test(flavor = "local")]
    async fn imports_only_the_required_chatgpt_grant_state() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        let manager = Authentication::new(database.clone());
        let access_token = jwt(unix_time().expect("time") + 3_600);

        let imported = manager
            .login(login_file(&access_token, "refresh-canary"))
            .await
            .expect("login");

        assert_eq!(imported.provider, "codex");
        assert!(imported.ready);
        assert_eq!(
            database
                .resolve(&SecretReference::from_opaque(ACCESS_SECRET))
                .await
                .expect("access token")
                .expose(),
            access_token.as_bytes()
        );
        assert_eq!(
            database
                .resolve(&SecretReference::from_opaque(REFRESH_SECRET))
                .await
                .expect("refresh token")
                .expose(),
            b"refresh-canary"
        );
        assert_eq!(
            database
                .resolve(&SecretReference::from_opaque(ACCOUNT_SECRET))
                .await
                .expect("account ID")
                .expose(),
            b"account-canary"
        );
        assert!(is_ready(&database).await.expect("readiness"));
    }

    #[tokio::test(flavor = "local")]
    async fn rejects_api_key_authentication_data() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        let manager = Authentication::new(database.clone());

        let error = manager
            .login(Zeroizing::new(
                serde_json::json!({ "auth_mode": "apikey", "OPENAI_API_KEY": "secret-canary" }).to_string(),
            ))
            .await
            .expect_err("reject API key");

        assert!(error.to_string().contains("ChatGPT subscription grant"));
        assert!(!error.to_string().contains("secret-canary"));
        assert!(!is_ready(&database).await.expect("readiness"));
    }

    #[tokio::test(flavor = "local")]
    async fn refreshes_and_rotates_before_resolving_the_access_token() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        let old_access = jwt(unix_time().expect("time") - 1);
        let new_access = jwt(unix_time().expect("time") + 3_600);
        let endpoint = serve_refresh(new_access.clone(), Some("rotated-refresh")).await;
        let manager = Authentication::new(database.clone()).with_refresh_url(endpoint);
        manager
            .login(login_file(&old_access, "refresh-canary"))
            .await
            .expect("login");

        let (first, second) = tokio::join!(manager.resolve_access(), manager.resolve_access());
        let first = first.expect("first resolved token");
        let second = second.expect("second resolved token");

        assert_eq!(first.expose(), new_access.as_bytes());
        assert_eq!(second.expose(), new_access.as_bytes());
        assert_eq!(
            database
                .resolve(&SecretReference::from_opaque(REFRESH_SECRET))
                .await
                .expect("rotated refresh token")
                .expose(),
            b"rotated-refresh"
        );
    }

    #[tokio::test(flavor = "local")]
    async fn transient_refresh_failures_have_a_cooldown_without_login_guidance() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        let expired_access = jwt(unix_time().expect("time") - 1);
        let (endpoint, requests) = serve_refresh_failure("502 Bad Gateway", r#"{"error":"upstream_error"}"#).await;
        let manager = Authentication::new(database).with_refresh_url(endpoint);
        manager
            .login(login_file(&expired_access, "refresh-canary"))
            .await
            .expect("login");

        let first = manager.resolve_access().await.expect_err("first refresh fails");
        let second = manager.resolve_access().await.expect_err("cooldown retains failure");

        assert_eq!(requests.get(), 1);
        assert!(first.to_string().contains("temporarily failed"));
        assert!(!first.to_string().contains("codex login"));
        assert_eq!(first.to_string(), second.to_string());
    }

    #[tokio::test(flavor = "local")]
    async fn terminal_refresh_failures_require_login_and_are_not_retried() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        let expired_access = jwt(unix_time().expect("time") - 1);
        let (endpoint, requests) =
            serve_refresh_failure("400 Bad Request", r#"{"error":{"code":"refresh_token_reused"}}"#).await;
        let manager = Authentication::new(database).with_refresh_url(endpoint);
        manager
            .login(login_file(&expired_access, "refresh-canary"))
            .await
            .expect("login");

        let first = manager.resolve_access().await.expect_err("first refresh fails");
        let second = manager.resolve_access().await.expect_err("terminal failure retained");

        assert_eq!(requests.get(), 1);
        assert!(first.to_string().contains("already used"));
        assert!(first.to_string().contains("agentctl codex login"));
        assert_eq!(first.to_string(), second.to_string());
    }
}
