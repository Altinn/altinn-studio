//! Host mediation setup for the Microsandbox Network Backend.

use std::{collections::BTreeMap, rc::Rc};

use ::sandbox::{SandboxHandle, SandboxId, SandboxName, network::NetworkBackend as _};
use sandbox_microsandbox::{MicrosandboxNetworkBackend, SecretBinding};
use zeroize::Zeroizing;

use crate::{Error, authorization::AgentPolicyEngine, control_plane, harness, persistence};

/// Connects Agent policy and host-owned secrets to the Microsandbox Network Backend.
pub(super) struct Preparation {
    database: persistence::Database,
    policy: Rc<AgentPolicyEngine>,
    network: Rc<MicrosandboxNetworkBackend>,
}

impl Preparation {
    /// Creates the Agent-side Microsandbox mediation adapter.
    #[must_use]
    pub(super) const fn new(
        database: persistence::Database,
        policy: Rc<AgentPolicyEngine>,
        network: Rc<MicrosandboxNetworkBackend>,
    ) -> Self {
        Self {
            database,
            policy,
            network,
        }
    }
}

impl Preparation {
    pub(super) fn network_is_running(&self, sandbox: &SandboxId) -> bool {
        self.network.is_running(sandbox)
    }

    pub(super) async fn restart_network(&self, sandbox: &SandboxHandle) -> Result<(), Error> {
        self.network.stop(sandbox.id()).await.map_err(Error::from)
    }

    pub(super) async fn prepare(&self, record: &control_plane::AgentRecord) -> Result<bool, Error> {
        let sandbox_name = record.sandbox_name()?;
        let result = async {
            let environment = if record.agent.spec.secrets.is_empty() {
                BTreeMap::new()
            } else {
                read_environment(&record.source_directory.join(".env")).await?
            };
            let mut secret_writes = Vec::with_capacity(record.agent.spec.secrets.len());
            for secret in &record.agent.spec.secrets {
                let value = environment.get(&secret.source).ok_or_else(|| {
                    Error::Invalid(format!(".env does not define required variable {:?}", secret.source))
                })?;
                if value.is_empty() {
                    return Err(Error::Invalid(format!(
                        ".env variable {:?} must not be empty",
                        secret.source
                    )));
                }
                secret_writes.push(persistence::StoredCredential {
                    name: secret.name.clone(),
                    value: Zeroizing::new(value.as_bytes().to_vec()),
                });
            }
            let references = self.database.replace_agent_secrets(record.id, secret_writes).await?;
            let mut bindings = Vec::with_capacity(record.agent.spec.secrets.len() + 1);
            for (secret, reference) in record.agent.spec.secrets.iter().zip(references) {
                bindings.push(SecretBinding::new(&secret.name, &secret.placeholder, reference)?);
            }
            let managed_secrets = harness::prepare(record.agent.spec.harness.kind, &self.database).await?;
            self.policy.set_agent(
                &sandbox_name,
                &record.agent,
                managed_secrets
                    .iter()
                    .map(|secret| (secret.name.into(), secret.allowed_hosts.clone())),
            );
            for secret in managed_secrets {
                bindings.push(SecretBinding::new(secret.name, secret.placeholder, secret.reference)?);
            }
            Ok(self.network.set_secret_bindings(sandbox_name.clone(), bindings)?)
        }
        .await;
        if result.is_err() {
            self.remove(&sandbox_name);
        }
        result
    }

    pub(super) fn remove(&self, sandbox: &SandboxName) {
        self.policy.remove_agent(sandbox);
        self.network.remove_secret_bindings(sandbox);
    }
}

async fn read_environment(path: &std::path::Path) -> Result<BTreeMap<String, Zeroizing<String>>, Error> {
    let bytes = Zeroizing::new(tokio::fs::read(path).await.map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            Error::Invalid("manifest secrets require a .env file beside the manifest".into())
        } else {
            Error::Io(error)
        }
    })?);
    let text = std::str::from_utf8(&bytes).map_err(|_| Error::Invalid(".env must be UTF-8".into()))?;
    let mut values = BTreeMap::new();
    for (line_index, original) in text.lines().enumerate() {
        let line = original.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((name, value)) = line.split_once('=') else {
            return Err(Error::Invalid(format!(
                "invalid .env assignment on line {}",
                line_index + 1
            )));
        };
        let name = name.trim();
        if name.is_empty()
            || !name
                .bytes()
                .enumerate()
                .all(|(index, byte)| byte == b'_' || byte.is_ascii_alphabetic() || (index > 0 && byte.is_ascii_digit()))
        {
            return Err(Error::Invalid(format!(
                "invalid .env variable name on line {}",
                line_index + 1
            )));
        }
        let value = unquote(value.trim())
            .ok_or_else(|| Error::Invalid(format!("unbalanced .env quotes on line {}", line_index + 1)))?;
        if values.insert(name.into(), Zeroizing::new(value.into())).is_some() {
            return Err(Error::Invalid(format!("duplicate .env variable {name:?}")));
        }
    }
    Ok(values)
}

fn unquote(value: &str) -> Option<&str> {
    match value.as_bytes().first() {
        Some(b'"') => value.strip_prefix('"')?.strip_suffix('"'),
        Some(b'\'') => value.strip_prefix('\'')?.strip_suffix('\''),
        _ if value.ends_with(['"', '\'']) => None,
        _ => Some(value),
    }
}
