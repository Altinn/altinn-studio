//! Linux Sandbox configuration for mediated Codex CLI authentication.

use sandbox::SandboxHandle;

use crate::{
    Error,
    sandbox::platform::{
        files::{read_existing, write_if_changed},
        run_checked,
    },
};

use super::super::{ACCESS_PLACEHOLDER, ACCOUNT_ENVIRONMENT, REFRESH_PLACEHOLDER};

pub(super) async fn configure(
    sandbox: &SandboxHandle,
    home: &str,
    instructions: Option<&[u8]>,
    skills: &[crate::harness::Skill],
) -> Result<(), Error> {
    let skills_path = format!("{home}/.agents/skills");
    let config = format!("{home}/.codex");
    let hooks_path = format!("{config}/hooks");
    let auth_path = format!("{config}/auth.json");
    let hook_path = format!("{config}/hooks/activity-hook.mjs");
    let hooks_config_path = format!("{config}/hooks.json");
    let instructions_path = format!("{config}/AGENTS.md");

    run_checked(sandbox, "/usr/bin/mkdir", ["-p", hooks_path.as_str()]).await?;
    let account_id = sandbox
        .snapshot()
        .environment
        .get(ACCOUNT_ENVIRONMENT)
        .cloned()
        .ok_or_else(|| Error::SandboxSetup("Codex account ID was not prepared for this Sandbox".into()))?;
    // Codex must believe it owns a normal ChatGPT login while the real,
    // rotating grant remains host-only. The fake JWT expiry and fresh refresh
    // timestamp suppress proactive guest refresh; a 401 can only attempt the
    // deliberately unusable placeholder refresh token.
    let now = time::OffsetDateTime::now_utc();
    let last_refresh = now
        .format(&time::format_description::well_known::Rfc3339)
        .map_err(|error| Error::SandboxSetup(format!("could not format Codex refresh time: {error}")))?;
    let auth = serde_json::json!({
        "auth_mode": "chatgpt",
        "OPENAI_API_KEY": null,
        "tokens": {
            "id_token": ACCESS_PLACEHOLDER,
            "access_token": ACCESS_PLACEHOLDER,
            "refresh_token": REFRESH_PLACEHOLDER,
            "account_id": account_id,
        },
        "last_refresh": last_refresh,
    });
    let existing = read_existing(sandbox, &auth_path, AUTH_MAX_BYTES).await;
    if auth_needs_refresh(existing.as_deref(), &auth, now) {
        write_if_changed(sandbox, &auth_path, &serde_json::to_vec(&auth)?).await?;
    }
    if let Some(instructions) = instructions {
        write_if_changed(sandbox, &instructions_path, instructions).await?;
    }
    write_if_changed(sandbox, &hook_path, super::super::hooks::script()?.as_bytes()).await?;
    let hooks = serde_json::to_vec(&super::super::hooks::configuration(&hook_path))?;
    write_if_changed(sandbox, &hooks_config_path, &hooks).await?;

    run_checked(
        sandbox,
        "/usr/bin/sudo",
        [
            "/usr/bin/chown",
            "agent:agent",
            config.as_str(),
            hooks_path.as_str(),
            auth_path.as_str(),
            hook_path.as_str(),
            hooks_config_path.as_str(),
        ],
    )
    .await?;
    run_checked(sandbox, "/usr/bin/chmod", ["600", auth_path.as_str()]).await?;
    if instructions.is_some() {
        run_checked(
            sandbox,
            "/usr/bin/sudo",
            ["/usr/bin/chown", "agent:agent", instructions_path.as_str()],
        )
        .await?;
        run_checked(sandbox, "/usr/bin/chmod", ["644", instructions_path.as_str()]).await?;
    }
    crate::harness::skills::install_linux(sandbox, &skills_path, skills).await
}

/// How long the placeholder login's refresh timestamp may age before setup rewrites it.
///
/// Codex only refreshes proactively once the timestamp is much older than this, and a
/// rewrite every reconciliation pass would make the file churn for no reason.
const AUTH_REFRESH_MAX_AGE: time::Duration = time::Duration::hours(24);
/// Longest login file setup parses; the Sandbox user can write the file, so a larger one is
/// replaced rather than read.
const AUTH_MAX_BYTES: usize = 1024 * 1024;

/// Whether the placeholder login on disk must be replaced by `desired`.
///
/// The two differ in `last_refresh` on every pass by construction; that alone does not warrant a
/// rewrite until the recorded timestamp is older than [`AUTH_REFRESH_MAX_AGE`]. Anything else
/// unreadable, unparsable or different does.
fn auth_needs_refresh(existing: Option<&[u8]>, desired: &serde_json::Value, now: time::OffsetDateTime) -> bool {
    let Some(mut existing) = existing.and_then(|bytes| serde_json::from_slice::<serde_json::Value>(bytes).ok()) else {
        return true;
    };
    let Some(recorded) = existing
        .get("last_refresh")
        .and_then(serde_json::Value::as_str)
        .and_then(|value| time::OffsetDateTime::parse(value, &time::format_description::well_known::Rfc3339).ok())
    else {
        return true;
    };
    if now - recorded > AUTH_REFRESH_MAX_AGE || recorded > now {
        return true;
    }
    if let Some(object) = existing.as_object_mut() {
        object.remove("last_refresh");
    }
    let mut desired = desired.clone();
    if let Some(object) = desired.as_object_mut() {
        object.remove("last_refresh");
    }
    existing != desired
}

#[cfg(test)]
mod tests {
    use super::auth_needs_refresh;

    fn desired() -> serde_json::Value {
        serde_json::json!({
            "auth_mode": "chatgpt",
            "tokens": {"access_token": "placeholder"},
            "last_refresh": "2026-09-17T12:00:00Z",
        })
    }

    fn at(rfc3339: &str) -> time::OffsetDateTime {
        time::OffsetDateTime::parse(rfc3339, &time::format_description::well_known::Rfc3339).expect("timestamp")
    }

    #[test]
    fn keeps_a_recent_equivalent_login() {
        let existing =
            br#"{"auth_mode":"chatgpt","tokens":{"access_token":"placeholder"},"last_refresh":"2026-09-17T09:00:00Z"}"#;
        assert!(!auth_needs_refresh(
            Some(existing),
            &desired(),
            at("2026-09-17T12:00:00Z")
        ));
    }

    #[test]
    fn refreshes_a_stale_timestamp() {
        let existing =
            br#"{"auth_mode":"chatgpt","tokens":{"access_token":"placeholder"},"last_refresh":"2026-09-15T09:00:00Z"}"#;
        assert!(auth_needs_refresh(
            Some(existing),
            &desired(),
            at("2026-09-17T12:00:00Z")
        ));
    }

    #[test]
    fn rewrites_when_the_login_differs_or_is_unreadable() {
        let existing =
            br#"{"auth_mode":"chatgpt","tokens":{"access_token":"other"},"last_refresh":"2026-09-17T09:00:00Z"}"#;
        assert!(auth_needs_refresh(
            Some(existing),
            &desired(),
            at("2026-09-17T12:00:00Z")
        ));
        assert!(auth_needs_refresh(
            Some(b"not json"),
            &desired(),
            at("2026-09-17T12:00:00Z")
        ));
        assert!(auth_needs_refresh(None, &desired(), at("2026-09-17T12:00:00Z")));
    }
}
