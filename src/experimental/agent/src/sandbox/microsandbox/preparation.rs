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

pub(super) struct PreparedNetwork {
    pub(super) bindings_changed: bool,
    pub(super) environment: BTreeMap<String, String>,
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

    pub(super) async fn prepare(&self, record: &control_plane::AgentRecord) -> Result<PreparedNetwork, Error> {
        let sandbox_name = record.sandbox_name()?;
        let result = async {
            let environment = if record.agent.spec.secrets.is_empty() {
                BTreeMap::new()
            } else {
                read_environment(&record.source_directory.join(".env")).await?
            };
            let mut secret_writes = Vec::with_capacity(record.agent.spec.secrets.len());
            for secret in &record.agent.spec.secrets {
                let value = environment.get(secret.source()).ok_or_else(|| {
                    Error::Invalid(format!(".env does not define required variable {:?}", secret.source()))
                })?;
                if value.is_empty() {
                    return Err(Error::Invalid(format!(
                        ".env variable {:?} must not be empty",
                        secret.source()
                    )));
                }
                secret_writes.push(persistence::StoredSecret {
                    name: secret.environment.clone(),
                    value: Zeroizing::new(value.as_bytes().to_vec()),
                });
            }
            let references = self.database.replace_agent_secrets(record.id, secret_writes).await?;
            let mut bindings = Vec::with_capacity(record.agent.spec.secrets.len() + 1);
            for (secret, reference) in record.agent.spec.secrets.iter().zip(references) {
                let binding = SecretBinding::with_placeholder(&secret.environment, secret.inert_value(), reference)?;
                bindings.push(binding);
            }
            let mut managed_secrets = Vec::new();
            let mut managed_environments = BTreeMap::new();
            let mut managed_placeholders = BTreeMap::new();
            for installation in &record.agent.spec.harnesses {
                for secret in harness::prepare(installation.kind, &self.database).await? {
                    if let Some(existing) = managed_environments.insert(secret.environment, installation.kind.as_str())
                    {
                        return Err(Error::Invalid(format!(
                            "harnesses {:?} and {:?} use the same managed environment {:?}",
                            existing,
                            installation.kind.as_str(),
                            secret.environment
                        )));
                    }
                    if let Some(existing) = managed_placeholders.insert(secret.placeholder, installation.kind.as_str())
                    {
                        return Err(Error::Invalid(format!(
                            "harnesses {:?} and {:?} use the same managed placeholder {:?}",
                            existing,
                            installation.kind.as_str(),
                            secret.placeholder
                        )));
                    }
                    managed_secrets.push(secret);
                }
            }
            self.policy.set_agent(
                &sandbox_name,
                &record.agent,
                managed_secrets
                    .iter()
                    .map(|secret| (secret.environment.into(), secret.allowed_hosts.clone())),
            );
            for secret in managed_secrets {
                bindings.push(SecretBinding::with_placeholder(
                    secret.environment,
                    secret.placeholder,
                    secret.reference,
                )?);
            }
            let guest_environment = bindings
                .iter()
                .map(|binding| {
                    let (name, value) = binding.guest_environment();
                    (name.to_owned(), value.to_owned())
                })
                .collect();
            let bindings_changed = self.network.set_secret_bindings(sandbox_name.clone(), bindings)?;
            Ok(PreparedNetwork {
                bindings_changed,
                environment: guest_environment,
            })
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
