use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
    future::poll_fn,
    num::NonZeroUsize,
    rc::Rc,
};

use microsandbox_network::control::{
    AuthorizationDecision as RuntimeDecision, ControllerMessage, NETWORK_CONTROL_PROTOCOL, NetworkOperation,
    RuntimeMessage, SecretMaterial as RuntimeSecretMaterial,
};
use microsandbox_network::secrets::config::{
    HostPattern, SecretEntry, SecretInjection, SecretSource, SecretsConfig, ViolationAction,
};
use sandbox::{
    Error, LocalFuture, ResourceKind, SandboxId, SandboxName,
    network::{
        NetworkBackend, NetworkBackendId, NetworkBatch, NetworkControlEndpointParts, NetworkControlMessage,
        NetworkEndpoint, NetworkEndpointSelection, NetworkTransferProgress, StartNetworkRequest,
    },
    secret_store::{SecretReference, SecretStore},
};
use sandbox_authorization::{
    Action, AuthorizationContext, AuthorizationDecision, AuthorizationRequest, PolicyEngine, Principal, Resource,
    vocabulary::{action, context, principal_kind, resource_kind},
};
use tokio::{sync::mpsc, task::JoinHandle};
use zeroize::Zeroizing;

const BACKEND_ID: &str = "microsandbox";
const RECEIVE_BATCH_SIZE: usize = 16;

/// Microsandbox Network Backend using the trusted runtime's protocol engine.
pub struct MicrosandboxNetworkBackend {
    policy: Rc<dyn PolicyEngine>,
    secret_store: Option<Rc<dyn SecretStore>>,
    secret_bindings: RefCell<HashMap<SandboxName, Vec<SecretBinding>>>,
    drivers: RefCell<HashMap<SandboxId, Driver>>,
}

/// Host-owned mapping from a non-secret placeholder to current secret material.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SecretBinding {
    environment: String,
    placeholder: String,
    reference: SecretReference,
}

struct Driver {
    commands: mpsc::Sender<DriverCommand>,
    task: JoinHandle<()>,
}

#[derive(Clone, Copy)]
struct SandboxSubject<'a> {
    id: &'a SandboxId,
    name: &'a SandboxName,
}

enum DriverCommand {
    RevokeAll,
}

impl MicrosandboxNetworkBackend {
    /// Creates a Network Backend that evaluates every runtime request with `policy`.
    #[must_use]
    pub fn new(policy: Rc<dyn PolicyEngine>) -> Self {
        Self {
            policy,
            secret_store: None,
            secret_bindings: RefCell::new(HashMap::new()),
            drivers: RefCell::new(HashMap::new()),
        }
    }

    /// Configures the host Secret Store used by mediated requests.
    #[must_use]
    pub fn with_secret_store(mut self, store: Rc<dyn SecretStore>) -> Self {
        self.secret_store = Some(store);
        self
    }

    /// Replaces the secret bindings applied when this named Sandbox's Network starts.
    ///
    /// Returns whether the binding definition changed. Existing connections
    /// keep their handshake configuration until the caller restarts the Network.
    /// Secret material itself is resolved from the store for every authorized
    /// use, so rotating a value behind an unchanged binding needs no restart.
    ///
    /// # Errors
    ///
    /// Returns an error when a binding is empty, duplicated, ambiguous, or
    /// unsafe for the Microsandbox control protocol.
    pub fn set_secret_bindings(&self, sandbox_name: SandboxName, bindings: Vec<SecretBinding>) -> Result<bool, Error> {
        validate_secret_bindings(&bindings)?;
        let changed = self.secret_bindings.borrow().get(&sandbox_name) != Some(&bindings);
        self.secret_bindings.borrow_mut().insert(sandbox_name, bindings);
        Ok(changed)
    }

    /// Removes the configured bindings for a named Sandbox.
    pub fn remove_secret_bindings(&self, sandbox_name: &SandboxName) {
        self.secret_bindings.borrow_mut().remove(sandbox_name);
    }

    /// Revokes all currently allowed flows for one running Sandbox.
    ///
    /// New operations continue to use the current Policy Engine state.
    ///
    /// # Errors
    ///
    /// Returns [`Error::NotFound`] when this process does not drive the
    /// Sandbox's Network endpoint.
    pub async fn revoke_all(&self, sandbox_id: &SandboxId) -> Result<(), Error> {
        let commands = self
            .drivers
            .borrow()
            .get(sandbox_id)
            .filter(|driver| !driver.task.is_finished())
            .map(|driver| driver.commands.clone())
            .ok_or_else(|| Error::not_found(ResourceKind::Network, sandbox_id))?;
        commands
            .send(DriverCommand::RevokeAll)
            .await
            .map_err(|_| Error::Backend("Microsandbox Network controller stopped".into()))
    }

    async fn stop_driver(&self, sandbox_id: &SandboxId) {
        let driver = self.drivers.borrow_mut().remove(sandbox_id);
        if let Some(driver) = driver {
            driver.task.abort();
            let _ = driver.task.await;
        }
    }
}

impl NetworkBackend for MicrosandboxNetworkBackend {
    fn id(&self) -> NetworkBackendId {
        NetworkBackendId::new(BACKEND_ID)
    }

    fn is_running(&self, sandbox_id: &SandboxId) -> bool {
        self.drivers
            .borrow()
            .get(sandbox_id)
            .is_some_and(|driver| !driver.task.is_finished())
    }

    fn select_endpoint(
        &self,
        available: &sandbox::network::NetworkEndpointCapabilities,
    ) -> Option<NetworkEndpointSelection> {
        let selection = NetworkEndpointSelection::Control(sandbox::network::NetworkControlProtocolId::new(
            NETWORK_CONTROL_PROTOCOL,
        ));
        available.supports(&selection).then_some(selection)
    }

    fn start(&self, request: StartNetworkRequest) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            if self.is_running(&request.sandbox_id) {
                return Ok(());
            }
            self.stop_driver(&request.sandbox_id).await;
            let NetworkEndpoint::Control(endpoint) = request.endpoint else {
                return Err(Error::UnsupportedNetworkEndpoint(request.endpoint.selection()));
            };
            if endpoint.properties().protocol().as_str() != NETWORK_CONTROL_PROTOCOL {
                return Err(Error::UnsupportedNetworkEndpoint(NetworkEndpointSelection::Control(
                    endpoint.properties().protocol().clone(),
                )));
            }
            let (commands, command_rx) = mpsc::channel(16);
            let policy = self.policy.clone();
            let secret_store = self.secret_store.clone();
            let secret_bindings = self
                .secret_bindings
                .borrow()
                .get(&request.sandbox_name)
                .cloned()
                .unwrap_or_default();
            let sandbox_id = request.sandbox_id.clone();
            let task = tokio::task::spawn_local(async move {
                if let Err(error) = drive(
                    sandbox_id,
                    request.sandbox_name,
                    endpoint.into_parts(),
                    policy,
                    secret_store,
                    secret_bindings,
                    command_rx,
                )
                .await
                {
                    tracing::warn!(%error, "Microsandbox Network controller stopped");
                }
            });
            self.drivers
                .borrow_mut()
                .insert(request.sandbox_id, Driver { commands, task });
            Ok(())
        })
    }

    fn stop<'a>(&'a self, sandbox_id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.stop_driver(sandbox_id).await;
            Ok(())
        })
    }

    fn delete<'a>(&'a self, sandbox_id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>> {
        self.stop(sandbox_id)
    }
}

impl SecretBinding {
    /// Creates a host-owned secret binding.
    ///
    /// # Errors
    ///
    /// Returns an error when the environment-variable name is invalid.
    pub fn new(environment: impl Into<String>, reference: SecretReference) -> Result<Self, Error> {
        let environment = environment.into();
        let placeholder = format!("$MSB_{environment}");
        Self::with_placeholder(environment, placeholder, reference)
    }

    /// Creates a host-owned secret binding with a caller-selected placeholder.
    ///
    /// # Errors
    ///
    /// Returns an error when the environment-variable name or placeholder is invalid.
    pub fn with_placeholder(
        environment: impl Into<String>,
        placeholder: impl Into<String>,
        reference: SecretReference,
    ) -> Result<Self, Error> {
        let binding = Self {
            environment: environment.into(),
            placeholder: placeholder.into(),
            reference,
        };
        if !valid_secret_binding(&binding) {
            return Err(Error::invalid(
                "secretBinding",
                "environment-variable name or placeholder is invalid",
            ));
        }
        Ok(binding)
    }

    /// Returns the non-secret environment assignment exposed inside the Sandbox.
    #[must_use]
    pub fn guest_environment(&self) -> (&str, &str) {
        (&self.environment, &self.placeholder)
    }

    fn runtime_entry(&self) -> SecretEntry {
        SecretEntry {
            env_var: self.environment.clone(),
            value: Zeroizing::new(String::new()),
            source: Some(SecretSource::Store {
                reference: self.environment.clone(),
            }),
            placeholder: self.placeholder.clone(),
            allowed_hosts: vec![HostPattern::Any],
            injection: SecretInjection::default(),
            on_violation: Some(ViolationAction::Block),
            require_tls_identity: true,
        }
    }
}

async fn drive(
    sandbox_id: SandboxId,
    sandbox_name: SandboxName,
    mut endpoint: NetworkControlEndpointParts,
    policy: Rc<dyn PolicyEngine>,
    secret_store: Option<Rc<dyn SecretStore>>,
    secret_bindings: Vec<SecretBinding>,
    mut commands: mpsc::Receiver<DriverCommand>,
) -> Result<(), Error> {
    let batch_size = NonZeroUsize::new(RECEIVE_BATCH_SIZE)
        .ok_or_else(|| Error::Backend("invalid Microsandbox Network receive batch size".into()))?;
    let mut received = NetworkBatch::new(batch_size);
    let mut handshake_complete = false;
    let mut flows = HashSet::new();

    loop {
        tokio::select! {
            progress = poll_fn(|context| endpoint.from_sandbox.as_mut().poll_receive(context, &mut received)) => {
                match progress.map_err(|error| Error::Backend(error.to_string()))? {
                    NetworkTransferProgress::Items(_) => {
                        while let Some(message) = received.pop_front() {
                            let runtime_message = serde_json::from_slice(message.as_bytes()).map_err(protocol_error)?;
                            let response = handle_runtime_message(
                                SandboxSubject {
                                    id: &sandbox_id,
                                    name: &sandbox_name,
                                },
                                runtime_message,
                                policy.as_ref(),
                                secret_store.as_deref(),
                                &secret_bindings,
                                &mut handshake_complete,
                                &mut flows,
                            ).await?;
                            if let Some(response) = response {
                                send(&mut endpoint, response).await?;
                            }
                        }
                    }
                    NetworkTransferProgress::Closed => return Ok(()),
                }
            }
            command = commands.recv() => {
                let Some(DriverCommand::RevokeAll) = command else {
                    return Ok(());
                };
                for flow_id in flows.drain() {
                    send(&mut endpoint, ControllerMessage::Revoke { flow_id }).await?;
                }
            }
        }
    }
}

async fn handle_runtime_message(
    subject: SandboxSubject<'_>,
    message: RuntimeMessage,
    policy: &dyn PolicyEngine,
    secret_store: Option<&dyn SecretStore>,
    secret_bindings: &[SecretBinding],
    handshake_complete: &mut bool,
    flows: &mut HashSet<u64>,
) -> Result<Option<ControllerMessage>, Error> {
    match message {
        RuntimeMessage::Hello { protocol } if protocol == NETWORK_CONTROL_PROTOCOL => {
            *handshake_complete = true;
            flows.clear();
            Ok(Some(ControllerMessage::HelloAccepted {
                protocol,
                secrets: SecretsConfig {
                    secrets: secret_bindings.iter().map(SecretBinding::runtime_entry).collect(),
                    on_violation: ViolationAction::Block,
                },
            }))
        }
        RuntimeMessage::Hello { .. } => Err(Error::Backend("invalid Microsandbox Network control handshake".into())),
        RuntimeMessage::AuthorizationRequest {
            request_id,
            flow_id,
            operation,
        } if *handshake_complete => {
            let authorization = authorize_operation(subject, &operation, policy, secret_store, secret_bindings).await;
            let (decision, secret_material) = authorization.map_or_else(
                || (RuntimeDecision::Deny, None),
                |secret_material| {
                    flows.insert(flow_id);
                    (RuntimeDecision::Allow, secret_material)
                },
            );
            Ok(Some(ControllerMessage::AuthorizationDecision {
                request_id,
                decision,
                secret_material,
            }))
        }
        RuntimeMessage::FlowClosed { flow_id } if *handshake_complete => {
            flows.remove(&flow_id);
            Ok(None)
        }
        RuntimeMessage::AuthorizationRequest { .. } | RuntimeMessage::FlowClosed { .. } => Err(Error::Backend(
            "Microsandbox Network request arrived before the protocol handshake".into(),
        )),
    }
}

async fn authorize_operation(
    subject: SandboxSubject<'_>,
    operation: &NetworkOperation,
    policy: &dyn PolicyEngine,
    secret_store: Option<&dyn SecretStore>,
    bindings: &[SecretBinding],
) -> Option<Option<RuntimeSecretMaterial>> {
    if let NetworkOperation::SecretUse { secret, locations, .. } = operation
        && (locations.is_empty()
            || locations.iter().collect::<HashSet<_>>().len() != locations.len()
            || !bindings.iter().any(|binding| binding.environment == *secret))
    {
        return None;
    }
    if !matches!(
        policy.evaluate(authorization_request(subject, operation)).await,
        Ok(AuthorizationDecision::Allow)
    ) {
        return None;
    }
    let NetworkOperation::SecretUse { secret, .. } = operation else {
        return Some(None);
    };
    let binding = bindings.iter().find(|binding| binding.environment == *secret)?;
    let store = secret_store?;
    let resolved = store.resolve(&binding.reference).await.ok()?;
    let value = std::str::from_utf8(resolved.expose()).ok()?;
    if value.is_empty() || value.bytes().any(|byte| matches!(byte, 0 | b'\r' | b'\n')) {
        return None;
    }
    Some(Some(RuntimeSecretMaterial::new(value.to_owned())))
}

fn authorization_request(subject: SandboxSubject<'_>, operation: &NetworkOperation) -> AuthorizationRequest {
    let principal = Principal::new(principal_kind::SANDBOX, subject.id.to_string());
    match operation {
        NetworkOperation::Connect {
            source,
            destination,
            transport,
            hostname,
            destination_is_host,
        } => {
            let mut authorization_context = sandbox_context(subject.name)
                .with_attribute(context::NETWORK_DESTINATION_ADDRESS, destination.to_string())
                .with_attribute(context::NETWORK_DESTINATION_IS_HOST, *destination_is_host)
                .with_attribute(context::NETWORK_TRANSPORT, transport_name(*transport));
            if let Some(source) = source {
                authorization_context.insert(context::NETWORK_SOURCE_ADDRESS, source.to_string());
            }
            let resource_id = hostname.as_ref().map_or_else(
                || destination.to_string(),
                |hostname| format!("{hostname}:{}", destination.port()),
            );
            if let Some(hostname) = hostname {
                authorization_context.insert(context::NETWORK_HOSTNAME, hostname.clone());
            }
            AuthorizationRequest {
                principal,
                action: Action::new(action::NETWORK_CONNECT),
                resource: Resource::new(resource_kind::EXTERNAL_SERVICE, resource_id),
                context: authorization_context,
            }
        }
        NetworkOperation::DnsQuery {
            name,
            record_type,
            resolver,
            transport,
        } => {
            let mut authorization_context = sandbox_context(subject.name)
                .with_attribute(context::DNS_RECORD_TYPE, record_type.clone())
                .with_attribute(context::NETWORK_TRANSPORT, transport_name(*transport));
            if let Some(resolver) = resolver {
                authorization_context.insert(context::DNS_RESOLVER, resolver.to_string());
            }
            AuthorizationRequest {
                principal,
                action: Action::new(action::DNS_QUERY),
                resource: Resource::new(resource_kind::DOMAIN, name.clone()),
                context: authorization_context,
            }
        }
        NetworkOperation::HttpRequest {
            destination,
            scheme,
            authority,
            method,
            path,
            version,
            stream_id,
        } => AuthorizationRequest {
            principal,
            action: Action::new(action::HTTP_REQUEST),
            resource: Resource::new(resource_kind::EXTERNAL_SERVICE, authority.clone()),
            context: http_context(*destination, *scheme, authority, method, path, *version, *stream_id)
                .with_attribute(context::SANDBOX_NAME, subject.name.as_str()),
        },
        NetworkOperation::SecretUse {
            destination,
            scheme,
            authority,
            method,
            path,
            version,
            stream_id,
            secret,
            locations,
        } => {
            let mut authorization_context =
                http_context(*destination, *scheme, authority, method, path, *version, *stream_id)
                    .with_attribute(context::SANDBOX_NAME, subject.name.as_str());
            authorization_context.insert(
                context::SECRET_LOCATIONS,
                locations
                    .iter()
                    .map(|location| secret_location_name(*location))
                    .map(str::to_string)
                    .collect::<Vec<_>>(),
            );
            AuthorizationRequest {
                principal,
                action: Action::new(action::SECRET_USE),
                resource: Resource::new(resource_kind::SECRET, secret.clone()),
                context: authorization_context,
            }
        }
    }
}

fn http_context(
    destination: std::net::SocketAddr,
    scheme: microsandbox_network::control::HttpScheme,
    authority: &str,
    method: &str,
    path: &str,
    version: microsandbox_network::control::HttpVersion,
    stream_id: Option<u32>,
) -> AuthorizationContext {
    let mut authorization_context = AuthorizationContext::new()
        .with_attribute(context::NETWORK_DESTINATION_ADDRESS, destination.to_string())
        .with_attribute(context::HTTP_SCHEME, http_scheme_name(scheme))
        .with_attribute(context::HTTP_AUTHORITY, authority)
        .with_attribute(context::HTTP_METHOD, method)
        .with_attribute(context::HTTP_PATH, path)
        .with_attribute(context::HTTP_VERSION, http_version_name(version));
    if let Some(stream_id) = stream_id {
        authorization_context.insert(context::HTTP_STREAM_ID, stream_id);
    }
    authorization_context
}

fn sandbox_context(sandbox_name: &SandboxName) -> AuthorizationContext {
    AuthorizationContext::new().with_attribute(context::SANDBOX_NAME, sandbox_name.as_str())
}

fn validate_secret_bindings(bindings: &[SecretBinding]) -> Result<(), Error> {
    if bindings.iter().any(|binding| !valid_secret_binding(binding)) {
        return Err(Error::invalid("secretBindings", "contains an invalid binding"));
    }
    let environments = bindings
        .iter()
        .map(|binding| &binding.environment)
        .collect::<HashSet<_>>();
    let placeholders = bindings
        .iter()
        .map(|binding| &binding.placeholder)
        .collect::<HashSet<_>>();
    let unambiguous = bindings.iter().enumerate().all(|(index, binding)| {
        bindings
            .iter()
            .enumerate()
            .all(|(other_index, other)| index == other_index || !binding.placeholder.contains(&other.placeholder))
    });
    if environments.len() != bindings.len() || placeholders.len() != bindings.len() || !unambiguous {
        return Err(Error::invalid(
            "secretBindings",
            "environment variables and placeholders must be unique and placeholders must be unambiguous",
        ));
    }
    Ok(())
}

fn valid_secret_binding(binding: &SecretBinding) -> bool {
    valid_environment_variable(&binding.environment)
        && !binding.placeholder.is_empty()
        && binding.placeholder.len() <= microsandbox_network::secrets::config::MAX_SECRET_PLACEHOLDER_BYTES
        && !binding
            .placeholder
            .bytes()
            .any(|byte| matches!(byte, 0 | b'\r' | b'\n'))
}

fn valid_environment_variable(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .enumerate()
            .all(|(index, byte)| byte == b'_' || byte.is_ascii_alphabetic() || (index > 0 && byte.is_ascii_digit()))
}

const fn http_scheme_name(scheme: microsandbox_network::control::HttpScheme) -> &'static str {
    match scheme {
        microsandbox_network::control::HttpScheme::Http => "http",
        microsandbox_network::control::HttpScheme::Https => "https",
    }
}

const fn http_version_name(version: microsandbox_network::control::HttpVersion) -> &'static str {
    match version {
        microsandbox_network::control::HttpVersion::Http1 => "http1",
        microsandbox_network::control::HttpVersion::Http2 => "http2",
    }
}

const fn secret_location_name(location: microsandbox_network::control::SecretLocation) -> &'static str {
    match location {
        microsandbox_network::control::SecretLocation::Header => "header",
        microsandbox_network::control::SecretLocation::BasicAuth => "basicAuth",
        microsandbox_network::control::SecretLocation::Query => "query",
    }
}

const fn transport_name(transport: microsandbox_network::control::TransportProtocol) -> &'static str {
    match transport {
        microsandbox_network::control::TransportProtocol::Tcp => "tcp",
        microsandbox_network::control::TransportProtocol::Udp => "udp",
        microsandbox_network::control::TransportProtocol::Icmpv4 => "icmpv4",
        microsandbox_network::control::TransportProtocol::Icmpv6 => "icmpv6",
    }
}

async fn send(endpoint: &mut NetworkControlEndpointParts, response: ControllerMessage) -> Result<(), Error> {
    let bytes = Zeroizing::new(serde_json::to_vec(&response).map_err(protocol_error)?);
    let one = NonZeroUsize::new(1).ok_or_else(|| Error::Backend("invalid Network control send batch size".into()))?;
    let mut pending = NetworkBatch::new(one);
    pending
        .push_back(NetworkControlMessage::from(bytes))
        .map_err(|_| Error::Backend("failed to queue Microsandbox Network response".into()))?;
    match poll_fn(|context| endpoint.to_sandbox.as_mut().poll_send(context, &mut pending))
        .await
        .map_err(|error| Error::Backend(error.to_string()))?
    {
        NetworkTransferProgress::Items(_) if pending.is_empty() => Ok(()),
        NetworkTransferProgress::Items(_) => Err(Error::Backend(
            "Microsandbox Network response was only partially accepted".into(),
        )),
        NetworkTransferProgress::Closed => {
            Err(Error::Backend("Microsandbox Network control endpoint is closed".into()))
        }
    }
}

fn protocol_error(error: impl std::fmt::Display) -> Error {
    Error::Backend(format!("invalid Microsandbox Network control message: {error}"))
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use std::time::Duration;
    use std::{
        cell::{Cell, RefCell},
        collections::BTreeMap,
        rc::Rc,
    };

    use microsandbox_network::control::{
        AuthorizationError, HttpScheme, HttpVersion, NetworkControlClient, NetworkOperation, TransportProtocol,
    };
    use sandbox::{
        LocalFuture, SandboxName,
        memory::MemorySecretStore,
        network::{NetworkBackend as _, NetworkEndpoint, StartNetworkRequest},
        secret_store::{SecretMaterial, SecretReference, SecretStore},
    };
    use sandbox_authorization::{AuthorizationDecision, AuthorizationRequest, PolicyEngine, StaticPolicy};

    use super::{MicrosandboxNetworkBackend, SecretBinding};

    struct TestControlEndpoint {
        #[cfg(unix)]
        _directory: tempfile::TempDir,
        path: std::path::PathBuf,
    }

    impl TestControlEndpoint {
        fn new() -> Self {
            #[cfg(unix)]
            {
                let directory = tempfile::tempdir().expect("temporary endpoint directory");
                let path = directory.path().join("network.sock");
                Self {
                    _directory: directory,
                    path,
                }
            }

            #[cfg(windows)]
            {
                Self {
                    path: format!(r"\\.\pipe\agent-network-test-{}", uuid::Uuid::new_v4()).into(),
                }
            }
        }
    }

    struct RecordingPolicy {
        decisions: RefCell<BTreeMap<String, AuthorizationDecision>>,
        requests: RefCell<Vec<AuthorizationRequest>>,
    }

    struct RecordingSecretStore {
        inner: MemorySecretStore,
        resolutions: Cell<usize>,
    }

    impl RecordingPolicy {
        fn allow_all() -> Self {
            Self {
                decisions: RefCell::new(BTreeMap::new()),
                requests: RefCell::new(Vec::new()),
            }
        }

        fn decide(&self, action: &str, decision: AuthorizationDecision) {
            self.decisions.borrow_mut().insert(action.to_string(), decision);
        }
    }

    impl PolicyEngine for RecordingPolicy {
        fn evaluate(
            &self,
            request: AuthorizationRequest,
        ) -> sandbox_authorization::LocalFuture<'_, Result<AuthorizationDecision, sandbox_authorization::Error>>
        {
            self.requests.borrow_mut().push(request.clone());
            let decision = self
                .decisions
                .borrow()
                .get(request.action.as_str())
                .copied()
                .unwrap_or(AuthorizationDecision::Allow);
            Box::pin(async move { Ok(decision) })
        }
    }

    impl RecordingSecretStore {
        fn new() -> Self {
            Self {
                inner: MemorySecretStore::default(),
                resolutions: Cell::new(0),
            }
        }
    }

    impl SecretStore for RecordingSecretStore {
        fn set<'a>(
            &'a self,
            name: &'a str,
            value: &'a [u8],
        ) -> LocalFuture<'a, Result<SecretReference, sandbox::Error>> {
            self.inner.set(name, value)
        }

        fn resolve<'a>(
            &'a self,
            reference: &'a SecretReference,
        ) -> LocalFuture<'a, Result<SecretMaterial, sandbox::Error>> {
            self.resolutions.set(self.resolutions.get() + 1);
            self.inner.resolve(reference)
        }
    }

    fn sandbox_id() -> sandbox::SandboxId {
        "d727d8a4-1345-4b31-b99d-59e04c9e476c"
            .parse()
            .expect("valid test Sandbox ID")
    }

    fn sandbox_name() -> SandboxName {
        SandboxName::new("worker").expect("valid test Sandbox name")
    }

    fn operation() -> NetworkOperation {
        NetworkOperation::Connect {
            source: Some("192.0.2.2:40000".parse().expect("valid test source")),
            destination: "198.51.100.10:443".parse().expect("valid test destination"),
            transport: TransportProtocol::Tcp,
            hostname: Some("example.com".to_string()),
            destination_is_host: false,
        }
    }

    fn dns_operation() -> NetworkOperation {
        NetworkOperation::DnsQuery {
            name: "example.com".to_string(),
            record_type: "A".to_string(),
            resolver: Some("192.0.2.53:53".parse().expect("valid test resolver")),
            transport: TransportProtocol::Udp,
        }
    }

    fn http_operation() -> NetworkOperation {
        NetworkOperation::HttpRequest {
            destination: "198.51.100.10:443".parse().expect("valid test destination"),
            scheme: HttpScheme::Https,
            authority: "example.com".to_string(),
            method: "POST".to_string(),
            path: "/items".to_string(),
            version: HttpVersion::Http2,
            stream_id: Some(3),
        }
    }

    fn secret_use_operation() -> NetworkOperation {
        NetworkOperation::SecretUse {
            destination: "198.51.100.10:443".parse().expect("valid test destination"),
            scheme: HttpScheme::Https,
            authority: "example.com".to_string(),
            method: "POST".to_string(),
            path: "/items".to_string(),
            version: HttpVersion::Http1,
            stream_id: None,
            secret: "PROVIDER_TOKEN".to_string(),
            locations: vec![microsandbox_network::control::SecretLocation::Header],
        }
    }

    #[test]
    fn maps_http_request_to_authorization_contract() {
        let sandbox_id = sandbox_id();
        let sandbox_name = sandbox_name();
        let request = super::authorization_request(
            super::SandboxSubject {
                id: &sandbox_id,
                name: &sandbox_name,
            },
            &http_operation(),
        );

        assert_eq!(request.action.as_str(), "http.request");
        assert_eq!(request.resource.kind, "externalService");
        assert_eq!(request.resource.id, "example.com");
        assert_eq!(
            request.context.attributes["network.destinationAddress"].as_str(),
            Some("198.51.100.10:443")
        );
        assert_eq!(request.context.attributes["http.scheme"].as_str(), Some("https"));
        assert_eq!(request.context.attributes["http.method"].as_str(), Some("POST"));
        assert_eq!(request.context.attributes["http.path"].as_str(), Some("/items"));
        assert_eq!(request.context.attributes["http.version"].as_str(), Some("http2"));
        assert_eq!(request.context.attributes["http.streamId"].as_integer(), Some(3));
    }

    #[test]
    fn secret_bindings_are_scoped_by_sandbox_name() {
        let backend = MicrosandboxNetworkBackend::new(Rc::new(StaticPolicy::allow_all()));
        let first = SandboxName::new("first").expect("valid Sandbox name");
        let second = SandboxName::new("second").expect("valid Sandbox name");
        backend
            .set_secret_bindings(
                first.clone(),
                vec![
                    SecretBinding::with_placeholder(
                        "FIRST_TOKEN",
                        "$FIRST_TOKEN",
                        SecretReference::from_opaque("first"),
                    )
                    .expect("valid first binding"),
                ],
            )
            .expect("configure first Sandbox");
        backend
            .set_secret_bindings(
                second.clone(),
                vec![
                    SecretBinding::with_placeholder(
                        "SECOND_TOKEN",
                        "$SECOND_TOKEN",
                        SecretReference::from_opaque("second"),
                    )
                    .expect("valid second binding"),
                ],
            )
            .expect("configure second Sandbox");

        let bindings = backend.secret_bindings.borrow();
        assert_eq!(bindings[&first][0].environment, "FIRST_TOKEN");
        assert_eq!(bindings[&second][0].environment, "SECOND_TOKEN");
    }

    #[test]
    fn default_secret_binding_exposes_an_inert_environment_placeholder() {
        let binding =
            SecretBinding::new("API_TOKEN", SecretReference::from_opaque("stored-token")).expect("valid binding");
        let runtime = binding.runtime_entry();

        assert_eq!(runtime.env_var, "API_TOKEN");
        assert_eq!(runtime.placeholder, "$MSB_API_TOKEN");
    }

    #[test]
    fn secret_binding_rejects_an_invalid_environment_variable() {
        let error = SecretBinding::new("NOT-AN-ENV", SecretReference::from_opaque("stored-token"))
            .expect_err("invalid environment-variable names must fail closed");

        assert!(error.to_string().contains("environment-variable name"));
    }

    #[test]
    fn replacing_secret_bindings_reports_definition_changes() {
        let backend = MicrosandboxNetworkBackend::new(Rc::new(StaticPolicy::allow_all()));
        let sandbox = sandbox_name();
        let binding = || SecretBinding::new("TOKEN", SecretReference::from_opaque("token")).expect("valid binding");

        assert!(
            backend
                .set_secret_bindings(sandbox.clone(), vec![binding()])
                .expect("initial binding")
        );
        assert!(
            !backend
                .set_secret_bindings(sandbox.clone(), vec![binding()])
                .expect("unchanged binding")
        );
        assert!(
            backend
                .set_secret_bindings(sandbox, Vec::new())
                .expect("removed binding")
        );
    }

    #[tokio::test(flavor = "local")]
    async fn controller_allows_and_revokes_a_live_flow() {
        let control = TestControlEndpoint::new();
        let path = control.path.clone();
        let controller = microsandbox_network::control::NetworkControlHost::bind(path.clone())
            .await
            .expect("bind Network control endpoint");
        let endpoint = crate::network_endpoint::open(controller).expect("open Network control endpoint");
        let backend = MicrosandboxNetworkBackend::new(Rc::new(StaticPolicy::allow_all()));
        let sandbox_id = sandbox_id();
        backend
            .start(StartNetworkRequest {
                sandbox_id: sandbox_id.clone(),
                sandbox_name: sandbox_name(),
                endpoint: NetworkEndpoint::Control(endpoint),
            })
            .await
            .expect("start Network Backend");
        let client = NetworkControlClient::new(path.clone(), &tokio::runtime::Handle::current());

        let mut grant = client
            .authorize(operation())
            .await
            .expect("operation should be allowed");
        let dns_grant = client
            .authorize(dns_operation())
            .await
            .expect("DNS query should be allowed");
        let http_grant = client
            .authorize(http_operation())
            .await
            .expect("HTTP request should be allowed");
        backend.revoke_all(&sandbox_id).await.expect("revoke live flows");
        tokio::time::timeout(Duration::from_secs(1), grant.revoked())
            .await
            .expect("revocation should reach runtime client");

        drop(grant);
        drop(dns_grant);
        drop(http_grant);
        drop(client);
        let reconnected = NetworkControlClient::new(path, &tokio::runtime::Handle::current());
        let _grant = reconnected
            .authorize(operation())
            .await
            .expect("a restarted runtime should establish a new control session");

        backend.stop(&sandbox_id).await.expect("stop Network Backend");
    }

    #[tokio::test(flavor = "local")]
    async fn controller_fails_closed_on_policy_denial_and_disconnect() {
        let control = TestControlEndpoint::new();
        let path = control.path.clone();
        let controller = microsandbox_network::control::NetworkControlHost::bind(path.clone())
            .await
            .expect("bind Network control endpoint");
        let endpoint = crate::network_endpoint::open(controller).expect("open Network control endpoint");
        let backend = MicrosandboxNetworkBackend::new(Rc::new(StaticPolicy::deny_all()));
        let sandbox_id = sandbox_id();
        backend
            .start(StartNetworkRequest {
                sandbox_id: sandbox_id.clone(),
                sandbox_name: sandbox_name(),
                endpoint: NetworkEndpoint::Control(endpoint),
            })
            .await
            .expect("start Network Backend");
        let client = NetworkControlClient::new(path, &tokio::runtime::Handle::current());

        let error = client
            .authorize(operation())
            .await
            .err()
            .expect("deny-all policy should refuse the operation");
        assert!(matches!(error, AuthorizationError::Denied));
        backend.stop(&sandbox_id).await.expect("stop Network Backend");
        let error = client
            .authorize(operation())
            .await
            .err()
            .expect("stopped controller should fail closed");
        assert!(matches!(
            error,
            AuthorizationError::Denied | AuthorizationError::Unavailable
        ));
    }

    #[tokio::test(flavor = "local")]
    async fn controller_resolves_secrets_after_both_authorizations_and_observes_rotation() {
        let control = TestControlEndpoint::new();
        let path = control.path.clone();
        let controller = microsandbox_network::control::NetworkControlHost::bind(path.clone())
            .await
            .expect("bind Network control endpoint");
        let endpoint = crate::network_endpoint::open(controller).expect("open Network control endpoint");
        let policy = Rc::new(RecordingPolicy::allow_all());
        let store = Rc::new(RecordingSecretStore::new());
        let reference = store
            .set("provider-token", b"first")
            .await
            .expect("store initial secret");
        let backend = MicrosandboxNetworkBackend::new(policy.clone()).with_secret_store(store.clone());
        backend
            .set_secret_bindings(
                sandbox_name(),
                vec![SecretBinding::with_placeholder("PROVIDER_TOKEN", "$TOKEN", reference).expect("valid binding")],
            )
            .expect("configure secret mediation");
        let sandbox_id = sandbox_id();
        backend
            .start(StartNetworkRequest {
                sandbox_id: sandbox_id.clone(),
                sandbox_name: sandbox_name(),
                endpoint: NetworkEndpoint::Control(endpoint),
            })
            .await
            .expect("start Network Backend");
        let client = NetworkControlClient::new(path, &tokio::runtime::Handle::current());

        let http_grant = client
            .authorize(NetworkOperation::HttpRequest {
                destination: "198.51.100.10:443".parse().expect("valid test destination"),
                scheme: HttpScheme::Https,
                authority: "example.com".to_string(),
                method: "POST".to_string(),
                path: "/items".to_string(),
                version: HttpVersion::Http1,
                stream_id: None,
            })
            .await
            .expect("HTTP request authorization");
        drop(http_grant);
        let material = client
            .authorize_secret_use(secret_use_operation())
            .await
            .expect("authorized secret use");
        assert_eq!(material.expose(), "first");
        assert_eq!(store.resolutions.get(), 1);
        {
            let requests = policy.requests.borrow();
            assert_eq!(requests[0].action.as_str(), "http.request");
            assert_eq!(requests[1].action.as_str(), "secret.use");
            assert_eq!(requests[1].resource.kind, "secret");
            assert_eq!(requests[1].resource.id, "PROVIDER_TOKEN");
            assert_eq!(
                requests[1].context.attributes["http.authority"].as_str(),
                Some("example.com")
            );
            assert_eq!(
                requests[1].context.attributes["secret.locations"]
                    .as_strings()
                    .expect("locations should be a list"),
                ["header"]
            );
        }

        store.set("provider-token", b"second").await.expect("rotate secret");
        let material = client
            .authorize_secret_use(secret_use_operation())
            .await
            .expect("authorized request after rotation");
        assert_eq!(material.expose(), "second");
        assert_eq!(store.resolutions.get(), 2);

        policy.decide("secret.use", AuthorizationDecision::Deny);
        assert!(matches!(
            client.authorize_secret_use(secret_use_operation()).await,
            Err(AuthorizationError::Denied)
        ));
        assert_eq!(store.resolutions.get(), 2);

        policy.decide("secret.use", AuthorizationDecision::Allow);
        policy.decide("http.request", AuthorizationDecision::Deny);
        assert!(matches!(
            client.authorize(http_operation()).await,
            Err(AuthorizationError::Denied)
        ));
        assert_eq!(store.resolutions.get(), 2);

        backend.stop(&sandbox_id).await.expect("stop Network Backend");
    }

    #[tokio::test(flavor = "local")]
    async fn unknown_bindings_and_secret_store_failures_are_denied() {
        let policy = StaticPolicy::allow_all();
        let store = MemorySecretStore::default();
        let sandbox_id = sandbox_id();
        let sandbox_name = sandbox_name();
        let subject = super::SandboxSubject {
            id: &sandbox_id,
            name: &sandbox_name,
        };
        let missing =
            SecretBinding::with_placeholder("PROVIDER_TOKEN", "$TOKEN", SecretReference::from_opaque("missing"))
                .expect("valid binding");

        assert!(
            super::authorize_operation(
                subject,
                &secret_use_operation(),
                &policy,
                Some(&store),
                std::slice::from_ref(&missing),
            )
            .await
            .is_none()
        );
        assert!(
            super::authorize_operation(subject, &secret_use_operation(), &policy, Some(&store), &[],)
                .await
                .is_none()
        );
    }
}
