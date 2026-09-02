//! Persistent `agentctl` contexts and endpoint selection.

use std::{
    collections::BTreeMap,
    env, fs,
    io::Write as _,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use crate::{Error, control_api::TcpEndpoint, manifest::API_VERSION};

/// Name of the implicit platform-local context.
pub const LOCAL_CONTEXT: &str = "local";
/// Environment variable selecting a context for one invocation.
pub const CONTEXT_ENVIRONMENT_VARIABLE: &str = "AGENT_CONTEXT";
/// Environment variable overriding the client configuration path.
pub const CONFIG_ENVIRONMENT_VARIABLE: &str = "AGENT_CONFIG";

const CONFIG_KIND: &str = "Config";

/// Runtime endpoint selected for an `agentctl` command.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Endpoint {
    /// Existing platform-local socket.
    Local,
    /// Unauthenticated and unencrypted TCP.
    Tcp(TcpEndpoint),
}

/// One resolved context name and endpoint.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SelectedContext {
    name: String,
    endpoint: Endpoint,
}

impl SelectedContext {
    /// Returns the selected context name.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Returns the selected transport endpoint.
    #[must_use]
    pub const fn endpoint(&self) -> &Endpoint {
        &self.endpoint
    }
}

/// Strict persisted `agentctl` context configuration.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Contexts {
    api_version: String,
    kind: String,
    #[serde(default = "local_context")]
    current_context: String,
    #[serde(default, rename = "contexts")]
    entries: BTreeMap<String, NamedContext>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct NamedContext {
    endpoint: StoredEndpoint,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "lowercase", deny_unknown_fields)]
enum StoredEndpoint {
    Tcp { address: String },
}

impl Default for Contexts {
    fn default() -> Self {
        Self {
            api_version: API_VERSION.into(),
            kind: CONFIG_KIND.into(),
            current_context: LOCAL_CONTEXT.into(),
            entries: BTreeMap::new(),
        }
    }
}

impl Contexts {
    /// Resolves `AGENT_CONFIG` or the default per-user configuration path.
    ///
    /// # Errors
    ///
    /// Returns an error when a relative `AGENT_CONFIG` cannot be resolved against the working
    /// directory or the platform user-home variable is not set.
    pub fn resolve_path() -> Result<PathBuf, Error> {
        if let Some(path) = env::var_os(CONFIG_ENVIRONMENT_VARIABLE).filter(|value| !value.is_empty()) {
            return absolute(Path::new(&path));
        }
        default_path()
    }

    /// Loads a strict configuration, or returns implicit local configuration when the file is absent.
    ///
    /// # Errors
    ///
    /// Returns an error when an existing file cannot be read, decoded, or validated.
    pub fn load(path: &Path) -> Result<Self, Error> {
        let bytes = match fs::read(path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Self::default()),
            Err(error) => return Err(configuration_error(path, "read", &error)),
        };
        let config: Self =
            serde_yaml_ng::from_slice(&bytes).map_err(|error| configuration_error(path, "parse", &error))?;
        config.validate(path)?;
        Ok(config)
    }

    /// Atomically writes configuration with permissions restricted to the current user.
    ///
    /// # Errors
    ///
    /// Returns an error when the parent or file cannot be created, secured, serialized, or persisted.
    pub fn save(&self, path: &Path) -> Result<(), Error> {
        self.validate(path)?;
        let parent = path
            .parent()
            .ok_or_else(|| Error::Configuration(format!("{} has no parent directory", path.display())))?;
        let create_private_directory = !parent.try_exists()?;
        fs::create_dir_all(parent)?;
        if create_private_directory {
            super::home::secure_directory(parent)?;
        }
        let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
        super::home::secure_file(temporary.path())?;
        serde_yaml_ng::to_writer(temporary.as_file_mut(), self)
            .map_err(|error| configuration_error(path, "serialize", &error))?;
        temporary.as_file_mut().flush()?;
        temporary.as_file().sync_all()?;
        temporary.persist(path).map_err(|error| Error::Io(error.error))?;
        super::home::secure_file(path)
    }

    /// Returns the persisted current context name.
    #[must_use]
    pub fn current(&self) -> &str {
        &self.current_context
    }

    /// Iterates over named TCP contexts in stable name order.
    pub fn tcp_contexts(&self) -> impl Iterator<Item = (&str, &str)> {
        self.entries.iter().map(|(name, context)| {
            let StoredEndpoint::Tcp { address } = &context.endpoint;
            (name.as_str(), address.as_str())
        })
    }

    /// Creates or replaces one named TCP context.
    ///
    /// # Errors
    ///
    /// Returns an error for an empty name or the reserved `local` name.
    pub fn set_tcp(&mut self, name: &str, endpoint: &TcpEndpoint) -> Result<(), Error> {
        validate_mutable_name(name)?;
        self.entries.insert(
            name.into(),
            NamedContext {
                endpoint: StoredEndpoint::Tcp {
                    address: endpoint.address().into(),
                },
            },
        );
        Ok(())
    }

    /// Selects an existing named context.
    ///
    /// # Errors
    ///
    /// Returns an error when the name is unknown.
    pub fn use_context(&mut self, name: &str) -> Result<(), Error> {
        self.context(name)?;
        self.current_context = name.into();
        Ok(())
    }

    /// Deletes a named TCP context and selects `local` when it was current.
    ///
    /// # Errors
    ///
    /// Returns an error for `local` or an unknown context.
    pub fn delete_context(&mut self, name: &str) -> Result<(), Error> {
        validate_mutable_name(name)?;
        if self.entries.remove(name).is_none() {
            return Err(unknown_context(name));
        }
        if self.current_context == name {
            self.current_context = LOCAL_CONTEXT.into();
        }
        Ok(())
    }

    /// Resolves command-line, environment, configured, and implicit selection precedence.
    ///
    /// # Errors
    ///
    /// Returns an error when the explicitly or implicitly selected name is unknown.
    pub fn select(&self, command_line: Option<&str>, environment: Option<&str>) -> Result<SelectedContext, Error> {
        let name = command_line
            .or_else(|| environment.filter(|value| !value.is_empty()))
            .unwrap_or(&self.current_context);
        Ok(SelectedContext {
            name: name.into(),
            endpoint: self.context(name)?,
        })
    }

    fn context(&self, name: &str) -> Result<Endpoint, Error> {
        if name == LOCAL_CONTEXT {
            return Ok(Endpoint::Local);
        }
        let context = self.entries.get(name).ok_or_else(|| unknown_context(name))?;
        let StoredEndpoint::Tcp { address } = &context.endpoint;
        TcpEndpoint::from_address(address).map(Endpoint::Tcp)
    }

    fn validate(&self, path: &Path) -> Result<(), Error> {
        if self.api_version != API_VERSION {
            return Err(Error::Configuration(format!(
                "{}: apiVersion must be {API_VERSION:?}",
                path.display()
            )));
        }
        if self.kind != CONFIG_KIND {
            return Err(Error::Configuration(format!(
                "{}: kind must be {CONFIG_KIND:?}",
                path.display()
            )));
        }
        for (name, context) in &self.entries {
            validate_mutable_name(name)?;
            let StoredEndpoint::Tcp { address } = &context.endpoint;
            TcpEndpoint::from_address(address)?;
        }
        self.context(&self.current_context)?;
        Ok(())
    }
}

fn validate_mutable_name(name: &str) -> Result<(), Error> {
    if name.is_empty() {
        return Err(Error::Configuration("context name must not be empty".into()));
    }
    if name == LOCAL_CONTEXT {
        return Err(Error::Configuration(
            "the built-in local context cannot be changed".into(),
        ));
    }
    Ok(())
}

fn unknown_context(name: &str) -> Error {
    Error::Configuration(format!("context {name:?} does not exist"))
}

fn configuration_error(path: &Path, operation: &str, error: &dyn std::fmt::Display) -> Error {
    Error::Configuration(format!("cannot {operation} {}: {error}", path.display()))
}

fn absolute(path: &Path) -> Result<PathBuf, Error> {
    if path.is_absolute() {
        Ok(path.into())
    } else {
        Ok(env::current_dir()?.join(path))
    }
}

fn local_context() -> String {
    LOCAL_CONTEXT.into()
}

#[cfg(target_os = "windows")]
fn default_path() -> Result<PathBuf, Error> {
    env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .map(|path| path.join(".agentctl").join("config.yaml"))
        .ok_or_else(|| Error::Configuration("USERPROFILE is not set".into()))
}

#[cfg(unix)]
fn default_path() -> Result<PathBuf, Error> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .map(|path| path.join(".agentctl").join("config.yaml"))
        .ok_or_else(|| Error::Configuration("HOME is not set".into()))
}

#[cfg(not(any(unix, target_os = "windows")))]
fn default_path() -> Result<PathBuf, Error> {
    Err(Error::Configuration("unsupported host operating system".into()))
}
