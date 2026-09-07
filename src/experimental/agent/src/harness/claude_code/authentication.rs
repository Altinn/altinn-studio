//! Claude Code host-side authentication.
//!
//! The agent stack holds its **own** long-lived Claude token, minted on the
//! host by `claude setup-token` and delivered through `agentctl claude login`.
//! It is a separate OAuth grant from the user's interactive Claude Code login,
//! so importing it neither reads nor rotates the host login: both keep working.
//! A setup token is long-lived and self-contained, so there is no refresh
//! token and no host-side refresh loop.

use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::{Error, harness::ImportedAuthentication, persistence};

use super::{ACCESS_SECRET, API_HOST, PROVIDER, SETUP_TOKEN_PREFIX};

/// Endpoint used to validate a freshly supplied token before it is stored.
const CLAUDE_PROFILE_URL: &str = "https://api.anthropic.com/api/oauth/profile";
const CLAUDE_OAUTH_BETA: &str = "oauth-2025-04-20";
const VALIDATE_REQUEST_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);

/// Owns the agent stack's Claude token on the trusted host.
pub(in crate::harness) struct Authentication {
    database: persistence::Database,
    client: reqwest::Client,
    profile_url: String,
}

impl Authentication {
    /// Creates a harness authentication manager over the shared database owner.
    #[must_use]
    pub(in crate::harness) fn new(database: persistence::Database) -> Self {
        Self {
            database,
            client: reqwest::Client::new(),
            profile_url: CLAUDE_PROFILE_URL.into(),
        }
    }

    /// Validates a host-minted setup token and stores it as the agent credential.
    ///
    /// Token material is never returned or logged.
    ///
    /// # Errors
    ///
    /// Returns an error when the token is malformed, rejected by Claude, or cannot be persisted.
    pub(in crate::harness) async fn login(&self, token: Zeroizing<String>) -> Result<ImportedAuthentication, Error> {
        let token = Zeroizing::new(token.trim().to_owned());
        if !token.starts_with(SETUP_TOKEN_PREFIX) {
            return Err(Error::Invalid(
                "Claude token is not a setup token; run `claude setup-token` to mint one".into(),
            ));
        }
        self.validate(&token).await?;
        let metadata = ClaudeMetadata {
            kind: CredentialKind::SetupToken,
        };
        self.database
            .put_provider_account(persistence::ProviderAccountWrite {
                provider: PROVIDER.into(),
                credentials: vec![persistence::StoredSecret {
                    name: ACCESS_SECRET.into(),
                    value: Zeroizing::new(token.as_bytes().to_vec()),
                }],
                metadata_json: serde_json::to_string(&metadata)?,
            })
            .await?;
        Ok(ImportedAuthentication {
            provider: PROVIDER.into(),
            ready: true,
        })
    }

    /// Confirms the token is recognized by Claude before it is trusted.
    ///
    /// This catches a mistyped or truncated token, not scope: a setup token is
    /// scoped for inference, not profile access, so the profile endpoint
    /// answers `403` (authenticated, forbidden) for a good token and `401`
    /// (unauthenticated) for a bad one. Only `401` rejects. A network failure
    /// or server error never blocks login — the token already passed its format
    /// check, and mediation surfaces any real problem on first use.
    async fn validate(&self, token: &str) -> Result<(), Error> {
        let sent = self
            .client
            .get(&self.profile_url)
            .timeout(VALIDATE_REQUEST_TIMEOUT)
            .bearer_auth(token)
            .header("anthropic-beta", CLAUDE_OAUTH_BETA)
            .send()
            .await;
        let Ok(response) = sent else {
            eprintln!("warning: could not reach Claude to validate the token; storing it anyway.");
            return Ok(());
        };
        let status = response.status();
        if status == reqwest::StatusCode::UNAUTHORIZED {
            Err(Error::Invalid(
                "Claude rejected the token; mint a fresh one with `claude setup-token`".into(),
            ))
        } else {
            if !status.is_success() && status != reqwest::StatusCode::FORBIDDEN {
                eprintln!("warning: unexpected HTTP {status} while validating the token; storing it anyway.");
            }
            Ok(())
        }
    }

    #[cfg(test)]
    fn with_profile_url(mut self, profile_url: String) -> Self {
        self.profile_url = profile_url;
        self
    }
}

/// How a stored Claude credential was obtained. A future `agentctl`-driven
/// PKCE grant can extend this without a schema change.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
enum CredentialKind {
    /// A long-lived token minted by `claude setup-token`.
    SetupToken,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ClaudeMetadata {
    kind: CredentialKind,
}

/// Confirms a stored Claude credential exists for mediation.
pub(super) async fn is_ready(database: &persistence::Database) -> Result<bool, Error> {
    database.provider_account_exists(PROVIDER).await
}

/// The host that the stored Claude token is mediated to.
pub(super) const fn mediated_host() -> &'static str {
    API_HOST
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use sandbox::secret_store::{SecretReference, SecretStore as _};
    use tempfile::TempDir;
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    use super::*;

    async fn serve_once(status: &'static str) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind profile endpoint");
        let endpoint = format!("http://{}/profile", listener.local_addr().expect("local address"));
        tokio::task::spawn_local(async move {
            let (mut stream, _) = listener.accept().await.expect("accept");
            let mut chunk = [0_u8; 1_024];
            let _ = stream.read(&mut chunk).await;
            let body = br#"{"account":{}}"#;
            stream
                .write_all(
                    format!(
                        "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await
                .expect("write headers");
            stream.write_all(body).await.expect("write body");
        });
        endpoint
    }

    #[tokio::test(flavor = "local")]
    async fn stores_a_validated_setup_token_without_a_refresh_secret() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        let endpoint = serve_once("200 OK").await;
        let manager = Authentication::new(database.clone()).with_profile_url(endpoint);

        let imported = manager
            .login(Zeroizing::new("sk-ant-oat01-token-canary\n".into()))
            .await
            .expect("login");
        assert_eq!(imported.provider, "claude");
        assert!(imported.ready);

        let access = database
            .resolve(&SecretReference::from_opaque("claude-access-token"))
            .await
            .expect("access token");
        assert_eq!(access.expose(), b"sk-ant-oat01-token-canary");
        assert!(is_ready(&database).await.expect("readiness"));
    }

    #[tokio::test(flavor = "local")]
    async fn rejects_a_non_setup_token_without_a_network_call() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        // Unroutable profile URL proves format validation happens before the network call.
        let manager = Authentication::new(database.clone()).with_profile_url("http://127.0.0.1:1/profile".into());
        let error = manager
            .login(Zeroizing::new("not-a-real-token".into()))
            .await
            .expect_err("reject");
        assert!(!error.to_string().contains("not-a-real-token"));
        assert!(!is_ready(&database).await.expect("readiness"));
    }

    #[tokio::test(flavor = "local")]
    async fn rejects_only_an_unauthenticated_token() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        let endpoint = serve_once("401 Unauthorized").await;
        let manager = Authentication::new(database.clone()).with_profile_url(endpoint);
        manager
            .login(Zeroizing::new("sk-ant-oat01-bad".into()))
            .await
            .expect_err("reject");
        assert!(!is_ready(&database).await.expect("readiness"));
    }

    #[tokio::test(flavor = "local")]
    async fn accepts_a_forbidden_response_because_setup_tokens_lack_profile_scope() {
        let directory = TempDir::new().expect("temporary directory");
        let database = persistence::Database::open(&directory.path().join("agent.db")).expect("database");
        // A valid setup token is scoped for inference, not profile, so the
        // profile endpoint answers 403 — which must still be accepted.
        let endpoint = serve_once("403 Forbidden").await;
        let manager = Authentication::new(database.clone()).with_profile_url(endpoint);
        manager
            .login(Zeroizing::new("sk-ant-oat01-valid-but-scoped".into()))
            .await
            .expect("accept scoped token");
        assert!(is_ready(&database).await.expect("readiness"));
    }
}
