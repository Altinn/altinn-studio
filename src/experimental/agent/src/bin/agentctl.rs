use std::{path::PathBuf, process::ExitCode};

use agent::{Error, control_api::Client, control_plane::ApplyRequest, home::ControlPlaneHome, manifest};
use clap::{Parser, Subcommand};
use tokio::runtime::LocalRuntime;

#[derive(Parser)]
#[command(about = "Manage the per-user Agent control plane")]
struct Arguments {
    /// Agent control-plane home.
    #[arg(long, global = true)]
    home: Option<PathBuf>,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Create or update an Agent from a manifest.
    Apply {
        /// Agent manifest path.
        #[arg(short = 'f', long = "filename")]
        filename: PathBuf,
    },
    /// Print one Agent as JSON.
    Get {
        /// Agent name.
        name: String,
    },
    /// Request deletion of one Agent.
    Delete {
        /// Agent name.
        name: String,
    },
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("agentctl: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), Error> {
    let arguments = Arguments::parse();
    let home = ControlPlaneHome::resolve(arguments.home.as_deref())?;
    let client = Client::for_path(home.socket_path());
    LocalRuntime::new()?.block_on(async move {
        match arguments.command {
            Command::Apply { filename } => {
                let applied = client.apply(read_apply_request(filename).await?).await?;
                println!("{}", serde_json::to_string_pretty(&applied)?);
            }
            Command::Get { name } => {
                let agent = client.get(&name).await?;
                println!("{}", serde_json::to_string_pretty(&agent)?);
            }
            Command::Delete { name } => {
                client.delete(&name).await?;
                println!("Agent {name:?} deleted");
            }
        }
        Ok(())
    })
}

async fn read_apply_request(filename: PathBuf) -> Result<ApplyRequest, Error> {
    let filename = absolute(filename)?;
    let bytes = tokio::fs::read(&filename).await?;
    let agent = manifest::decode(&bytes)?;
    let source_directory = filename
        .parent()
        .ok_or_else(|| Error::Invalid("manifest path has no parent directory".into()))?
        .to_path_buf();
    Ok(ApplyRequest {
        source_directory,
        agent,
    })
}

fn absolute(path: PathBuf) -> Result<PathBuf, Error> {
    if path.is_absolute() {
        Ok(path)
    } else {
        Ok(std::env::current_dir()?.join(path))
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use std::time::SystemTime;

    use super::*;

    #[test]
    fn apply_source_is_resolved_in_the_client_working_directory() {
        let nonce = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("system time should follow the epoch")
            .as_nanos();
        let directory = std::env::temp_dir().join(format!("agentctl-source-{}-{nonce}", std::process::id()));
        std::fs::create_dir_all(&directory).expect("temporary directory");
        let manifest_path = directory.join("agent.yaml");
        std::fs::copy(
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("examples/agent.yaml"),
            &manifest_path,
        )
        .expect("copy example manifest");
        let original_directory = std::env::current_dir().expect("current directory");
        std::env::set_current_dir(&directory).expect("enter temporary directory");

        let result = LocalRuntime::new()
            .expect("local runtime")
            .block_on(read_apply_request(PathBuf::from("agent.yaml")));

        std::env::set_current_dir(original_directory).expect("restore current directory");
        std::fs::remove_dir_all(&directory).expect("remove temporary directory");
        let request = result.expect("read apply request");
        assert_eq!(request.source_directory, directory);
    }
}
