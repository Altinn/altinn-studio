//! Host mediation setup for the Microsandbox Network Backend.

use std::{collections::BTreeMap, rc::Rc};

use crate::{Error, authorization::AgentPolicyEngine, control_plane, environment, harness, persistence};
use ::sandbox::{SandboxHandle, SandboxId, SandboxName, network::NetworkBackend as _};
use sandbox_microsandbox::{MicrosandboxNetworkBackend, SecretBinding};

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
                environment::read(&record.env_file_path()).await?
            };
            let mut secret_writes = Vec::with_capacity(record.agent.spec.secrets.len());
            for secret in &record.agent.spec.secrets {
                let value = environment::required(&environment, secret.source())?;
                secret_writes.push(persistence::StoredSecret {
                    name: secret.environment.clone(),
                    value: zeroize::Zeroizing::new(value.as_bytes().to_vec()),
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
