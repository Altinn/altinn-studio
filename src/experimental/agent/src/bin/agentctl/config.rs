use std::path::{Path, PathBuf};

use agent::{
    Error,
    control_api::TcpEndpoint,
    local::{
        contexts::{Contexts, Endpoint, LOCAL_CONTEXT},
        home::ControlPlaneHome,
    },
};
use clap::Subcommand;

use super::CommandResult;

const INSECURE_WARNING: &str =
    "WARNING: TCP has no authentication or encryption; use only for trusted local development";

#[derive(Subcommand)]
pub(super) enum ConfigCommand {
    /// List configured contexts and the current selection.
    GetContexts,
    /// Create or replace a named TCP context.
    SetContext {
        /// Context name.
        name: String,
        /// Unauthenticated endpoint in the form tcp://HOST:PORT.
        #[arg(long)]
        endpoint: TcpEndpoint,
    },
    /// Select a configured context.
    UseContext {
        /// Context name, including the built-in local context.
        name: String,
    },
    /// Delete a named TCP context.
    DeleteContext {
        /// Context name.
        name: String,
    },
}

pub(super) fn execute(
    command: ConfigCommand,
    contexts: &mut Contexts,
    config_path: &Path,
    home: Option<&Path>,
    context_override: Option<&str>,
    environment_context: Option<&str>,
) -> CommandResult<()> {
    match command {
        ConfigCommand::GetContexts => {
            let selected = contexts.select(context_override, environment_context)?;
            let local_endpoint = local_endpoint(home)?;
            let mut rows = vec![context_row(
                selected.name(),
                LOCAL_CONTEXT,
                "local",
                &local_endpoint,
                "LOCAL OS",
            )];
            rows.extend(
                contexts
                    .tcp_contexts()
                    .map(|(name, address)| context_row(selected.name(), name, "tcp", address, "NO AUTH/TLS")),
            );
            super::print_table(&["CURRENT", "NAME", "TYPE", "ENDPOINT", "SECURITY"], &rows);
        }
        ConfigCommand::SetContext { name, endpoint } => {
            contexts.set_tcp(&name, &endpoint)?;
            contexts.save(config_path)?;
            eprintln!("{INSECURE_WARNING}");
            println!("context/{name} configured");
        }
        ConfigCommand::UseContext { name } => {
            let selected = contexts.select(Some(&name), None)?;
            let insecure = matches!(selected.endpoint(), Endpoint::Tcp(_));
            contexts.use_context(&name)?;
            contexts.save(config_path)?;
            if insecure {
                eprintln!("{INSECURE_WARNING}");
            }
            println!("Switched to context {name:?}.");
        }
        ConfigCommand::DeleteContext { name } => {
            contexts.delete_context(&name)?;
            contexts.save(config_path)?;
            println!("context/{name} deleted");
        }
    }
    Ok(())
}

pub(super) fn warn_insecure_tcp(endpoint: &TcpEndpoint) {
    eprintln!("{INSECURE_WARNING}: {endpoint}");
}

fn context_row(current: &str, name: &str, kind: &str, endpoint: &str, security: &str) -> Vec<String> {
    vec![
        if current == name { "*" } else { "" }.into(),
        name.into(),
        kind.into(),
        endpoint.into(),
        security.into(),
    ]
}

fn local_endpoint(configured: Option<&Path>) -> Result<String, Error> {
    if configured.is_some() || environment_home().is_some() {
        return Ok(ControlPlaneHome::resolve(configured)?
            .socket_path()
            .display()
            .to_string());
    }
    Ok("platform default".into())
}

fn environment_home() -> Option<PathBuf> {
    std::env::var_os("AGENT_HOME")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    #[test]
    fn explicit_home_resolves_the_local_socket_endpoint() {
        let home = std::env::temp_dir().join("agentctl-context-local-home");
        assert!(home.is_absolute());
        let endpoint = local_endpoint(Some(&home)).expect("resolve local endpoint");

        assert_eq!(PathBuf::from(endpoint), home.join("run").join("agentd.sock"));
    }
}
