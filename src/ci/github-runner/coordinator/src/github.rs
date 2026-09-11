use std::{
    io,
    time::{Duration, SystemTime},
};

use jsonwebtoken::{Algorithm, EncodingKey, Header, encode};
use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};

use crate::AnyError;

const API_VERSION: &str = "2022-11-28";
const MAX_ERROR_BODY_BYTES: usize = 4096;
const RUNNERS_PER_PAGE: u64 = 100;

#[derive(Clone)]
pub(crate) struct GithubConfig {
    pub(crate) api_url: String,
    pub(crate) app_id: u64,
    pub(crate) installation_id: u64,
    pub(crate) private_key: String,
    pub(crate) registration_path: String,
    pub(crate) runners_path: String,
}

pub(crate) struct GithubClient {
    client: Client,
    api_url: String,
    installation_token: String,
    registration_path: String,
    runners_path: String,
}

#[derive(Serialize)]
struct AppClaims {
    iat: u64,
    exp: u64,
    iss: u64,
}

#[derive(Deserialize)]
struct AccessTokenResponse {
    token: String,
}

#[derive(Deserialize)]
struct RunnerList {
    total_count: u64,
    runners: Vec<Runner>,
}

#[derive(Deserialize)]
struct Runner {
    id: u64,
    name: String,
    busy: bool,
}

impl GithubClient {
    pub(crate) async fn authenticate(config: GithubConfig) -> Result<Self, AnyError> {
        let client = Client::builder()
            .user_agent("altinn-studio-github-runner")
            .timeout(Duration::from_secs(30))
            .build()?;
        let jwt = app_jwt(config.app_id, &config.private_key)?;
        let url = format!(
            "{}/app/installations/{}/access_tokens",
            config.api_url.trim_end_matches('/'),
            config.installation_id
        );
        let response = checked_response(
            client
                .post(url)
                .bearer_auth(jwt)
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", API_VERSION)
                .send()
                .await?,
            "create GitHub App installation token",
        )
        .await?;
        let token: AccessTokenResponse = response.json().await?;
        require_token("GitHub App installation token", &token.token)?;

        Ok(Self {
            client,
            api_url: config.api_url.trim_end_matches('/').to_string(),
            installation_token: token.token,
            registration_path: config.registration_path,
            runners_path: config.runners_path,
        })
    }

    pub(crate) async fn registration_token(&self) -> Result<String, AnyError> {
        let response = checked_response(
            self.request(self.client.post(self.url(&self.registration_path)))
                .send()
                .await?,
            "create runner registration token",
        )
        .await?;
        let token: AccessTokenResponse = response.json().await?;
        require_token("runner registration token", &token.token)?;
        Ok(token.token)
    }

    pub(crate) async fn remove_runner(&self, name: &str) -> Result<bool, AnyError> {
        let Some(runner) = self.find_runner(name).await? else {
            return Ok(false);
        };
        let delete_url = format!("{}/{id}", self.url(&self.runners_path), id = runner.id);
        checked_response(
            self.request(self.client.delete(delete_url)).send().await?,
            "delete stale runner",
        )
        .await?;
        Ok(true)
    }

    pub(crate) async fn runner_busy(&self, name: &str) -> Result<Option<bool>, AnyError> {
        Ok(self.find_runner(name).await?.map(|runner| runner.busy))
    }

    async fn find_runner(&self, name: &str) -> Result<Option<Runner>, AnyError> {
        let mut page = 1_u64;
        loop {
            let url = format!(
                "{}?per_page={RUNNERS_PER_PAGE}&page={page}",
                self.url(&self.runners_path)
            );
            let response = checked_response(self.request(self.client.get(url)).send().await?, "list runners").await?;
            let runners: RunnerList = response.json().await?;
            if let Some(runner) = runners.runners.into_iter().find(|runner| runner.name == name) {
                return Ok(Some(runner));
            }

            if page.saturating_mul(RUNNERS_PER_PAGE) >= runners.total_count {
                return Ok(None);
            }
            page += 1;
        }
    }

    fn request(&self, request: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        request
            .bearer_auth(&self.installation_token)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", API_VERSION)
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.api_url, path)
    }
}

fn app_jwt(app_id: u64, private_key: &str) -> Result<String, AnyError> {
    let now = SystemTime::UNIX_EPOCH.elapsed()?.as_secs();
    let claims = AppClaims {
        iat: now.saturating_sub(60),
        exp: now + 540,
        iss: app_id,
    };
    // Secret managers commonly deliver PEM values with escaped newlines.
    let key = EncodingKey::from_rsa_pem(private_key.replace("\\n", "\n").as_bytes())?;
    encode(&Header::new(Algorithm::RS256), &claims, &key).map_err(Into::into)
}

fn require_token(label: &str, token: &str) -> Result<(), io::Error> {
    if token.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("GitHub returned an empty {label}"),
        ));
    }
    Ok(())
}

async fn checked_response(response: Response, operation: &str) -> Result<Response, AnyError> {
    let status = response.status();
    if status.is_success() {
        return Ok(response);
    }

    let body = response.text().await?;
    let body = truncate_error_body(&body);
    Err(io::Error::other(format!("failed to {operation}: GitHub returned {status}: {body}")).into())
}

fn truncate_error_body(body: &str) -> &str {
    let mut end = body.len().min(MAX_ERROR_BODY_BYTES);
    while !body.is_char_boundary(end) {
        end -= 1;
    }
    &body[..end]
}

#[cfg(test)]
mod tests {
    use super::{
        Algorithm, AppClaims, EncodingKey, GithubClient, Header, MAX_ERROR_BODY_BYTES, encode, require_token,
        truncate_error_body,
    };

    #[test]
    fn joins_api_url_and_absolute_endpoint_path() {
        let client = GithubClient {
            client: reqwest::Client::new(),
            api_url: "https://api.github.test".to_string(),
            installation_token: "secret".to_string(),
            registration_path: "/repos/Altinn/altinn-studio/actions/runners/registration-token".to_string(),
            runners_path: "/repos/Altinn/altinn-studio/actions/runners".to_string(),
        };
        assert_eq!(
            client.url(&client.registration_path),
            "https://api.github.test/repos/Altinn/altinn-studio/actions/runners/registration-token"
        );
    }

    #[test]
    fn rejects_empty_token() {
        assert!(require_token("test token", "").is_err());
        assert!(require_token("test token", "token").is_ok());
    }

    #[test]
    fn truncates_error_body_without_exceeding_byte_limit_or_splitting_utf8() {
        let ascii = "a".repeat(MAX_ERROR_BODY_BYTES + 1);
        assert_eq!(truncate_error_body(&ascii).len(), MAX_ERROR_BODY_BYTES);

        let unicode = format!("{}é", "a".repeat(MAX_ERROR_BODY_BYTES - 1));
        let truncated = truncate_error_body(&unicode);
        assert_eq!(truncated.len(), MAX_ERROR_BODY_BYTES - 1);
        assert_eq!(truncated, "a".repeat(MAX_ERROR_BODY_BYTES - 1));
    }

    #[test]
    fn rsa_crypto_provider_is_configured() {
        let claims = AppClaims {
            iat: 0,
            exp: 1,
            iss: 123,
        };
        let invalid_key = EncodingKey::from_rsa_der(b"invalid test key");

        assert!(encode(&Header::new(Algorithm::RS256), &claims, &invalid_key).is_err());
    }
}
