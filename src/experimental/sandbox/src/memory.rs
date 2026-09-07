//! Single-threaded in-memory implementations used for tests and early wiring.

use std::{
    cell::RefCell,
    collections::{BTreeMap, BTreeSet, VecDeque},
    net::{IpAddr, Ipv4Addr, Ipv6Addr},
    num::{NonZeroU32, NonZeroUsize},
    pin::Pin,
    rc::Rc,
    task::{Context, Poll},
};

use futures_core::Stream;
use sha2::{Digest as _, Sha256};
use tokio::{io::AsyncReadExt as _, sync::mpsc};
use tokio_util::sync::PollSender;
use zeroize::Zeroizing;

use crate::{
    Error, LocalFuture, PendingOperation, Platform, ResourceKind, RootFilesystemMode, RootFilesystemModeSet, Sandbox,
    SandboxFeature, SandboxId, SandboxName, SandboxPath, SandboxPhase, SandboxResources, SandboxState,
    backend::{CreateSandboxRequest, SandboxBackend, SandboxBackendCapabilities},
    execution, file_transfer, image,
    mount::{MountKind, MountKindSet},
    network,
    provider::SandboxProvider,
    secret_store::{SecretMaterial, SecretReference, SecretStore},
    terminal, volume,
};

impl SandboxProvider for Provider {
    fn backend(&self) -> &dyn SandboxBackend {
        self
    }

    fn image_backend(&self) -> &dyn image::ImageBackend {
        &MemoryImageBackend
    }
}

/// In-memory Sandbox Provider for tests and early wiring.
pub struct Provider {
    state: Rc<RefCell<BackendState>>,
    supported_platforms: BTreeSet<Platform>,
}

#[derive(Default)]
struct BackendState {
    by_id: BTreeMap<SandboxId, Sandbox>,
    by_name: BTreeMap<SandboxName, SandboxId>,
    executions: BTreeSet<(SandboxId, execution::ExecutionId)>,
    files: BTreeMap<(SandboxId, SandboxPath), Vec<u8>>,
    execution_specs: Vec<execution::ExecutionSpec>,
    matched_execution_events: VecDeque<MatchedExecutionEvents>,
    queued_execution_events: VecDeque<Vec<execution::ExecutionEvent>>,
    queued_terminal_events: VecDeque<Vec<terminal::TerminalEvent>>,
    volumes_by_id: BTreeMap<volume::VolumeId, volume::Volume>,
    volumes_by_name: BTreeMap<volume::VolumeName, volume::VolumeId>,
    network_endpoints: BTreeMap<SandboxId, PacketPeer>,
    network_properties: BTreeMap<SandboxId, network::PacketEndpointProperties>,
}

struct MatchedExecutionEvents {
    predicate: Rc<dyn Fn(&execution::ExecutionSpec) -> bool>,
    events: Vec<execution::ExecutionEvent>,
}

impl Provider {
    /// Creates an empty Provider.
    #[must_use]
    pub fn new() -> Self {
        Self::with_platforms(test_platform(), [])
    }

    /// Creates an empty Provider with one or more supported Platforms.
    #[must_use]
    pub fn with_platforms(platform: Platform, additional_platforms: impl IntoIterator<Item = Platform>) -> Self {
        let mut supported_platforms: BTreeSet<_> = additional_platforms.into_iter().collect();
        supported_platforms.insert(platform);
        Self {
            state: Rc::new(RefCell::new(BackendState::default())),
            supported_platforms,
        }
    }

    /// Returns the number of materialized sandboxes.
    #[must_use]
    pub fn count(&self) -> usize {
        self.state.borrow().by_id.len()
    }

    /// Supplies the events returned by the next Execution started by this Provider.
    pub fn queue_execution_events(&self, events: Vec<execution::ExecutionEvent>) {
        self.state.borrow_mut().queued_execution_events.push_back(events);
    }

    /// Supplies events for the next Execution whose specification matches the predicate.
    ///
    /// Unlike [`Self::queue_execution_events`], unrelated Executions do not
    /// consume this response while exercising multi-command reconciliation.
    pub fn queue_execution_events_matching(
        &self,
        predicate: impl Fn(&execution::ExecutionSpec) -> bool + 'static,
        events: Vec<execution::ExecutionEvent>,
    ) {
        self.state
            .borrow_mut()
            .matched_execution_events
            .push_back(MatchedExecutionEvents {
                predicate: Rc::new(predicate),
                events,
            });
    }

    /// Returns every normal Execution specification observed by this Provider.
    #[must_use]
    pub fn execution_specs(&self) -> Vec<execution::ExecutionSpec> {
        self.state.borrow().execution_specs.clone()
    }

    /// Supplies the events returned by the next terminal Execution.
    pub fn queue_terminal_events(&self, events: Vec<terminal::TerminalEvent>) {
        self.state.borrow_mut().queued_terminal_events.push_back(events);
    }

    fn set_state(&self, id: &SandboxId, state: SandboxState) -> Result<(), Error> {
        let mut storage = self.state.borrow_mut();
        let sandbox = storage
            .by_id
            .get_mut(id)
            .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id))?;
        sandbox.state = state;
        Ok(())
    }

    fn ensure_running(&self, id: &SandboxId) -> Result<(), Error> {
        let storage = self.state.borrow();
        let sandbox = storage
            .by_id
            .get(id)
            .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id))?;
        if sandbox.state != SandboxState::Running {
            return Err(Error::invalid("sandbox.state", "must be running"));
        }
        Ok(())
    }

    fn end_execution(&self, sandbox_id: &SandboxId, execution_id: &execution::ExecutionId) -> Result<(), Error> {
        if self
            .state
            .borrow_mut()
            .executions
            .remove(&(sandbox_id.clone(), execution_id.clone()))
        {
            Ok(())
        } else {
            Err(Error::not_found(ResourceKind::Execution, execution_id))
        }
    }
}

impl Default for Provider {
    fn default() -> Self {
        Self::new()
    }
}

/// In-memory Secret Store for tests and local composition.
#[derive(Clone, Default)]
pub struct MemorySecretStore {
    values: Rc<RefCell<BTreeMap<SecretReference, Zeroizing<Vec<u8>>>>>,
}

impl SecretStore for MemorySecretStore {
    fn set<'a>(&'a self, name: &'a str, value: &'a [u8]) -> LocalFuture<'a, Result<SecretReference, Error>> {
        Box::pin(async move {
            let reference = SecretReference::from_opaque(name);
            self.values
                .borrow_mut()
                .insert(reference.clone(), Zeroizing::new(value.to_vec()));
            Ok(reference)
        })
    }

    fn resolve<'a>(&'a self, reference: &'a SecretReference) -> LocalFuture<'a, Result<SecretMaterial, Error>> {
        Box::pin(async move {
            self.values
                .borrow()
                .get(reference)
                .map(|value| SecretMaterial::new(value.to_vec()))
                .ok_or_else(|| Error::not_found(ResourceKind::Secret, reference.as_str()))
        })
    }
}

struct MemoryExecutionEventStream {
    events: VecDeque<execution::ExecutionEvent>,
    execution: Option<(SandboxId, execution::ExecutionId)>,
    state: Rc<RefCell<BackendState>>,
}

struct MemoryTerminalEventStream {
    events: VecDeque<terminal::TerminalEvent>,
    execution: Option<(SandboxId, execution::ExecutionId)>,
    state: Rc<RefCell<BackendState>>,
}

struct MemoryTerminalControl {
    execution: (SandboxId, execution::ExecutionId),
    state: Rc<RefCell<BackendState>>,
}

impl Stream for MemoryExecutionEventStream {
    type Item = Result<execution::ExecutionEvent, Error>;

    fn poll_next(mut self: Pin<&mut Self>, _context: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let event = self.events.pop_front();
        if (event.is_none()
            || event.as_ref().is_some_and(|event| {
                matches!(
                    event,
                    execution::ExecutionEvent::Exited(_) | execution::ExecutionEvent::Failed { .. }
                )
            }))
            && let Some(execution) = self.execution.take()
        {
            self.state.borrow_mut().executions.remove(&execution);
        }
        Poll::Ready(event.map(Ok))
    }
}

impl Stream for MemoryTerminalEventStream {
    type Item = Result<terminal::TerminalEvent, Error>;

    fn poll_next(mut self: Pin<&mut Self>, _context: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let event = self.events.pop_front();
        if (event.is_none()
            || event.as_ref().is_some_and(|event| {
                matches!(
                    event,
                    terminal::TerminalEvent::Exited(_) | terminal::TerminalEvent::Failed { .. }
                )
            }))
            && let Some(execution) = self.execution.take()
        {
            self.state.borrow_mut().executions.remove(&execution);
        }
        Poll::Ready(event.map(Ok))
    }
}
impl terminal::TerminalControl for MemoryTerminalControl {
    fn write_input(&self, _bytes: bytes::Bytes) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move { self.ensure_live() })
    }

    fn close_input(&self) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move { self.ensure_live() })
    }

    fn resize(&self, _size: terminal::TerminalSize) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move { self.ensure_live() })
    }
}

impl MemoryTerminalControl {
    fn ensure_live(&self) -> Result<(), Error> {
        if self.state.borrow().executions.contains(&self.execution) {
            Ok(())
        } else {
            Err(Error::not_found(ResourceKind::Execution, &self.execution.1))
        }
    }
}

impl SandboxBackend for Provider {
    fn capabilities<'a>(
        &'a self,
        platform: &'a Platform,
    ) -> LocalFuture<'a, Result<SandboxBackendCapabilities, Error>> {
        Box::pin(async move {
            if !self.supported_platforms.contains(platform) {
                return Err(Error::UnsupportedPlatform(platform.clone()));
            }
            Ok(SandboxBackendCapabilities::new(
                [
                    SandboxFeature::Execution,
                    SandboxFeature::TerminalExecution,
                    SandboxFeature::FileTransfer,
                    SandboxFeature::PersistentVolumes,
                    SandboxFeature::ImageInit,
                ]
                .into(),
                MountKindSet::from([MountKind::Volume, MountKind::Bind, MountKind::Tmpfs]),
                RootFilesystemModeSet::from([RootFilesystemMode::Layered, RootFilesystemMode::Direct]),
                network::NetworkEndpointCapabilities::new()
                    .with_packet_medium(network::PacketMedium::Ethernet)
                    .with_packet_medium(network::PacketMedium::Ip),
            ))
        })
    }

    fn create(&self, request: CreateSandboxRequest) -> PendingOperation<'_, Sandbox> {
        PendingOperation::run(SandboxPhase::SandboxCreate, move |_progress| {
            Box::pin(async move {
                let mut storage = self.state.borrow_mut();
                if let Some(id) = storage.by_name.get(&request.name) {
                    return storage
                        .by_id
                        .get(id)
                        .cloned()
                        .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id));
                }
                let id = request.id;
                if let Some(network::NetworkAttachment {
                    endpoint: network::NetworkEndpointSelection::Packet(medium),
                    ..
                }) = &request.network
                {
                    storage
                        .network_properties
                        .insert(id.clone(), packet_properties(*medium)?);
                }
                let sandbox = Sandbox {
                    id: id.clone(),
                    image: request.image,
                    init_system: request.init_system,
                    name: request.name,
                    resources: request.resources,
                    state: SandboxState::Stopped,
                    mounts: request.mounts,
                    environment: request.environment,
                    network: request.network,
                };
                storage.by_name.insert(sandbox.name.clone(), id.clone());
                storage.by_id.insert(id, sandbox.clone());
                Ok(sandbox)
            })
        })
    }

    fn update_resources<'a>(&'a self, id: &'a SandboxId, resources: SandboxResources) -> PendingOperation<'a, Sandbox> {
        PendingOperation::run(SandboxPhase::SandboxUpdate, move |_progress| {
            Box::pin(async move {
                let mut storage = self.state.borrow_mut();
                let sandbox = storage
                    .by_id
                    .get_mut(id)
                    .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id))?;
                if sandbox.resources.root_filesystem().mode() != resources.root_filesystem().mode() {
                    return Err(Error::Immutable("resources.rootFilesystem.mode"));
                }
                sandbox.resources = resources;
                Ok(sandbox.clone())
            })
        })
    }

    fn update_environment<'a>(
        &'a self,
        id: &'a SandboxId,
        environment: BTreeMap<String, String>,
    ) -> PendingOperation<'a, Sandbox> {
        PendingOperation::run(SandboxPhase::SandboxUpdate, move |_progress| {
            Box::pin(async move {
                let mut storage = self.state.borrow_mut();
                let sandbox = storage
                    .by_id
                    .get_mut(id)
                    .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id))?;
                if sandbox.state != SandboxState::Stopped {
                    return Err(Error::invalid("sandbox.state", "must be stopped"));
                }
                sandbox.environment = environment;
                Ok(sandbox.clone())
            })
        })
    }

    fn find<'a>(&'a self, name: &'a SandboxName) -> LocalFuture<'a, Result<Sandbox, Error>> {
        Box::pin(async move {
            let storage = self.state.borrow();
            let id = storage
                .by_name
                .get(name)
                .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, name))?;
            storage
                .by_id
                .get(id)
                .cloned()
                .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id))
        })
    }

    fn inspect<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<Sandbox, Error>> {
        Box::pin(async move {
            self.state
                .borrow()
                .by_id
                .get(id)
                .cloned()
                .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id))
        })
    }

    fn start<'a>(&'a self, id: &'a SandboxId) -> PendingOperation<'a, ()> {
        PendingOperation::run(SandboxPhase::SandboxStart, move |_progress| {
            Box::pin(async move { self.set_state(id, SandboxState::Running) })
        })
    }

    fn stop<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.set_state(id, SandboxState::Stopped)?;
            let mut storage = self.state.borrow_mut();
            storage.executions.retain(|(sandbox_id, _)| sandbox_id != id);
            storage.network_endpoints.remove(id);
            Ok(())
        })
    }

    fn delete<'a>(&'a self, id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            let mut storage = self.state.borrow_mut();
            let sandbox = storage
                .by_id
                .remove(id)
                .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id))?;
            storage.by_name.remove(&sandbox.name);
            storage.executions.retain(|(sandbox_id, _)| sandbox_id != id);
            storage.files.retain(|(sandbox_id, _), _| sandbox_id != id);
            storage.network_endpoints.remove(id);
            storage.network_properties.remove(id);
            Ok(())
        })
    }

    fn open_network_endpoint<'a>(
        &'a self,
        id: &'a SandboxId,
    ) -> LocalFuture<'a, Result<network::NetworkEndpoint, Error>> {
        Box::pin(async move {
            let mut storage = self.state.borrow_mut();
            let sandbox = storage
                .by_id
                .get(id)
                .ok_or_else(|| Error::not_found(ResourceKind::Sandbox, id))?;
            let attachment = sandbox
                .network
                .as_ref()
                .ok_or(Error::invalid("network", "Sandbox has no attachment"))?;
            let network::NetworkEndpointSelection::Packet(_) = attachment.endpoint else {
                return Err(Error::UnsupportedNetworkEndpoint(attachment.endpoint.clone()));
            };
            let capacity =
                NonZeroUsize::new(64).ok_or_else(|| Error::Backend("invalid memory queue capacity".into()))?;
            let properties = storage
                .network_properties
                .get(id)
                .cloned()
                .ok_or_else(|| Error::Backend("missing persisted memory Network interface configuration".into()))?;
            let (endpoint, peer) = packet_endpoint_pair(capacity, properties);
            storage.network_endpoints.insert(id.clone(), peer);
            Ok(network::NetworkEndpoint::Packet(endpoint))
        })
    }

    fn start_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        request: execution::StartExecutionRequest,
    ) -> LocalFuture<'a, Result<execution::StartedExecution, Error>> {
        Box::pin(async move {
            let (id, spec) = request.into_parts();
            self.ensure_running(sandbox_id)?;
            let mut storage = self.state.borrow_mut();
            let execution_key = (sandbox_id.clone(), id.clone());
            storage.executions.insert(execution_key.clone());
            storage.execution_specs.push(spec.clone());
            let matched = storage
                .matched_execution_events
                .iter()
                .position(|response| (response.predicate)(&spec))
                .and_then(|index| storage.matched_execution_events.remove(index))
                .map(|response| response.events);
            let events = matched
                .or_else(|| storage.queued_execution_events.pop_front())
                .unwrap_or_else(|| {
                    vec![
                        execution::ExecutionEvent::Started { process_id: None },
                        execution::ExecutionEvent::Exited(execution::ExitStatus { code: 0 }),
                    ]
                });

            Ok(execution::StartedExecution {
                id,
                events: Box::pin(MemoryExecutionEventStream {
                    events: events.into(),
                    execution: Some(execution_key),
                    state: self.state.clone(),
                }),
            })
        })
    }

    fn start_terminal_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        request: terminal::StartTerminalExecutionRequest,
    ) -> LocalFuture<'a, Result<terminal::StartedTerminalExecution, Error>> {
        Box::pin(async move {
            let (id, _spec, _initial_size) = request.into_parts();
            self.ensure_running(sandbox_id)?;
            let mut storage = self.state.borrow_mut();
            let execution_key = (sandbox_id.clone(), id.clone());
            storage.executions.insert(execution_key.clone());
            let events = storage.queued_terminal_events.pop_front().unwrap_or_else(|| {
                vec![
                    terminal::TerminalEvent::Started { process_id: None },
                    terminal::TerminalEvent::Exited(execution::ExitStatus { code: 0 }),
                ]
            });
            let control = Rc::new(MemoryTerminalControl {
                execution: execution_key.clone(),
                state: self.state.clone(),
            });

            Ok(terminal::StartedTerminalExecution {
                id,
                control,
                events: Box::pin(MemoryTerminalEventStream {
                    events: events.into(),
                    execution: Some(execution_key),
                    state: self.state.clone(),
                }),
            })
        })
    }

    fn attach_terminal<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        _request: terminal::AttachTerminalRequest,
    ) -> LocalFuture<'a, Result<terminal::TerminalAttachOutcome, Error>> {
        Box::pin(async move {
            self.ensure_running(sandbox_id)?;
            Err(Error::UnsupportedFeature(SandboxFeature::TerminalAttach))
        })
    }
    fn terminate_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        execution_id: &'a execution::ExecutionId,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move { self.end_execution(sandbox_id, execution_id) })
    }

    fn kill_execution<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        execution_id: &'a execution::ExecutionId,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move { self.end_execution(sandbox_id, execution_id) })
    }

    fn read_file<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        path: &'a SandboxPath,
    ) -> LocalFuture<'a, Result<file_transfer::ByteReader, Error>> {
        Box::pin(async move {
            self.ensure_running(sandbox_id)?;
            let contents = self
                .state
                .borrow()
                .files
                .get(&(sandbox_id.clone(), path.clone()))
                .cloned()
                .ok_or_else(|| Error::not_found(ResourceKind::File, path.as_str()))?;
            Ok(Box::pin(std::io::Cursor::new(contents)) as file_transfer::ByteReader)
        })
    }

    fn write_file<'a>(
        &'a self,
        sandbox_id: &'a SandboxId,
        path: &'a SandboxPath,
        mut contents: file_transfer::ByteReader,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.ensure_running(sandbox_id)?;
            let mut bytes = Vec::new();
            contents.read_to_end(&mut bytes).await.map_err(|source| Error::Io {
                operation: "read Sandbox file-transfer input",
                source,
            })?;
            self.ensure_running(sandbox_id)?;
            self.state
                .borrow_mut()
                .files
                .insert((sandbox_id.clone(), path.clone()), bytes);
            Ok(())
        })
    }

    fn ensure_volume(&self, request: volume::EnsureVolumeRequest) -> LocalFuture<'_, Result<volume::Volume, Error>> {
        Box::pin(async move {
            let (id, name) = request.into_parts();
            let mut storage = self.state.borrow_mut();
            if let Some(existing_id) = storage.volumes_by_name.get(&name) {
                return storage
                    .volumes_by_id
                    .get(existing_id)
                    .cloned()
                    .ok_or_else(|| Error::not_found(ResourceKind::Volume, existing_id));
            }
            let volume = volume::Volume { id: id.clone(), name };
            storage.volumes_by_name.insert(volume.name.clone(), id.clone());
            storage.volumes_by_id.insert(id, volume.clone());
            Ok(volume)
        })
    }

    fn find_volume<'a>(&'a self, name: &'a volume::VolumeName) -> LocalFuture<'a, Result<volume::Volume, Error>> {
        Box::pin(async move {
            let storage = self.state.borrow();
            let id = storage
                .volumes_by_name
                .get(name)
                .ok_or_else(|| Error::not_found(ResourceKind::Volume, name))?;
            storage
                .volumes_by_id
                .get(id)
                .cloned()
                .ok_or_else(|| Error::not_found(ResourceKind::Volume, id))
        })
    }

    fn delete_volume<'a>(&'a self, id: &'a volume::VolumeId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            let mut storage = self.state.borrow_mut();
            let volume = storage
                .volumes_by_id
                .remove(id)
                .ok_or_else(|| Error::not_found(ResourceKind::Volume, id))?;
            storage.volumes_by_name.remove(&volume.name);
            Ok(())
        })
    }
}

/// Sandbox-facing peer paired with an in-memory [`network::PacketEndpoint`].
///
/// This type supports endpoint contract tests and keeps the in-memory Sandbox
/// Backend's side of each live connection open.
pub struct PacketPeer {
    from_sandbox: Option<mpsc::Sender<network::NetworkPacket>>,
    to_sandbox: mpsc::Receiver<network::NetworkPacket>,
    maximum_packet_length: usize,
}

impl PacketPeer {
    /// Emits one packet as if it came from the Sandbox's virtual network device.
    ///
    /// # Errors
    ///
    /// Returns an error when the packet is too large or the Network Backend has
    /// closed its receiving direction.
    pub async fn emit_from_sandbox(&self, packet: network::NetworkPacket) -> Result<(), network::NetworkEndpointError> {
        if packet.len() > self.maximum_packet_length {
            return Err(network::NetworkEndpointError::PacketTooLarge {
                actual: packet.len(),
                maximum: self.maximum_packet_length,
            });
        }
        let sender = self
            .from_sandbox
            .as_ref()
            .ok_or(network::NetworkEndpointError::Closed)?;
        sender
            .send(packet)
            .await
            .map_err(|_| network::NetworkEndpointError::Closed)
    }

    /// Receives the next packet addressed to the Sandbox.
    pub async fn receive_for_sandbox(&mut self) -> Option<network::NetworkPacket> {
        self.to_sandbox.recv().await
    }

    /// Closes the direction in which the Sandbox emits packets.
    pub fn close_from_sandbox(&mut self) {
        self.from_sandbox = None;
    }

    /// Closes the direction in which the Sandbox receives packets.
    pub fn close_to_sandbox(&mut self) {
        self.to_sandbox.close();
    }
}

/// Creates a bounded in-memory packet endpoint and its Sandbox-facing peer.
#[must_use]
pub fn packet_endpoint_pair(
    capacity: NonZeroUsize,
    properties: network::PacketEndpointProperties,
) -> (network::PacketEndpoint, PacketPeer) {
    let (from_sandbox, network_receiver) = mpsc::channel(capacity.get());
    let (network_sender, to_sandbox) = mpsc::channel(capacity.get());
    let maximum_packet_length = properties.maximum_frame_length().get() as usize;
    (
        network::PacketEndpoint::new(
            properties,
            MemoryPacketReceiver {
                receiver: network_receiver,
            },
            MemoryPacketSender {
                sender: PollSender::new(network_sender),
                maximum_packet_length,
            },
        ),
        PacketPeer {
            from_sandbox: Some(from_sandbox),
            to_sandbox,
            maximum_packet_length,
        },
    )
}

struct MemoryPacketReceiver {
    receiver: mpsc::Receiver<network::NetworkPacket>,
}

impl network::BatchReceiver<network::NetworkPacket> for MemoryPacketReceiver {
    fn poll_receive(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        output: &mut network::NetworkPacketBatch,
    ) -> Poll<Result<network::NetworkTransferProgress, network::NetworkEndpointError>> {
        if output.is_full() {
            return Poll::Ready(Err(network::NetworkEndpointError::FullReceiveBatch));
        }

        let mut received = 0;
        while !output.is_full() {
            match self.receiver.poll_recv(context) {
                Poll::Ready(Some(packet)) => {
                    if output.push_back(packet).is_err() {
                        return Poll::Ready(Err(network::NetworkEndpointError::FullReceiveBatch));
                    }
                    received += 1;
                }
                Poll::Ready(None) => {
                    return NonZeroUsize::new(received)
                        .map_or(Poll::Ready(Ok(network::NetworkTransferProgress::Closed)), |received| {
                            Poll::Ready(Ok(network::NetworkTransferProgress::Items(received)))
                        });
                }
                Poll::Pending => {
                    return NonZeroUsize::new(received).map_or(Poll::Pending, |received| {
                        Poll::Ready(Ok(network::NetworkTransferProgress::Items(received)))
                    });
                }
            }
        }

        NonZeroUsize::new(received).map_or(
            Poll::Ready(Err(network::NetworkEndpointError::FullReceiveBatch)),
            |received| Poll::Ready(Ok(network::NetworkTransferProgress::Items(received))),
        )
    }
}

struct MemoryPacketSender {
    sender: PollSender<network::NetworkPacket>,
    maximum_packet_length: usize,
}

impl network::BatchSender<network::NetworkPacket> for MemoryPacketSender {
    fn poll_send(
        mut self: Pin<&mut Self>,
        context: &mut Context<'_>,
        pending: &mut network::NetworkPacketBatch,
    ) -> Poll<Result<network::NetworkTransferProgress, network::NetworkEndpointError>> {
        if pending.is_empty() {
            return Poll::Ready(Err(network::NetworkEndpointError::EmptySendBatch));
        }

        let mut sent = 0;
        while let Some(packet) = pending.front() {
            if packet.len() > self.maximum_packet_length {
                return match NonZeroUsize::new(sent) {
                    Some(sent) => Poll::Ready(Ok(network::NetworkTransferProgress::Items(sent))),
                    None => Poll::Ready(Err(network::NetworkEndpointError::PacketTooLarge {
                        actual: packet.len(),
                        maximum: self.maximum_packet_length,
                    })),
                };
            }

            match self.sender.poll_reserve(context) {
                Poll::Ready(Ok(())) => {
                    let Some(packet) = pending.pop_front() else {
                        return Poll::Ready(Err(network::NetworkEndpointError::EmptySendBatch));
                    };
                    if let Err(error) = self.sender.send_item(packet) {
                        if let Some(packet) = error.into_inner()
                            && pending.push_front(packet).is_err()
                        {
                            return Poll::Ready(Err(network::NetworkEndpointError::Backend(
                                "failed to restore an unaccepted Network packet".into(),
                            )));
                        }
                        return NonZeroUsize::new(sent)
                            .map_or(Poll::Ready(Ok(network::NetworkTransferProgress::Closed)), |sent| {
                                Poll::Ready(Ok(network::NetworkTransferProgress::Items(sent)))
                            });
                    }
                    sent += 1;
                }
                Poll::Ready(Err(_)) => {
                    return NonZeroUsize::new(sent)
                        .map_or(Poll::Ready(Ok(network::NetworkTransferProgress::Closed)), |sent| {
                            Poll::Ready(Ok(network::NetworkTransferProgress::Items(sent)))
                        });
                }
                Poll::Pending => {
                    return NonZeroUsize::new(sent).map_or(Poll::Pending, |sent| {
                        Poll::Ready(Ok(network::NetworkTransferProgress::Items(sent)))
                    });
                }
            }
        }

        NonZeroUsize::new(sent).map_or(
            Poll::Ready(Err(network::NetworkEndpointError::EmptySendBatch)),
            |sent| Poll::Ready(Ok(network::NetworkTransferProgress::Items(sent))),
        )
    }

    fn poll_flush(self: Pin<&mut Self>, _context: &mut Context<'_>) -> Poll<Result<(), network::NetworkEndpointError>> {
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(
        mut self: Pin<&mut Self>,
        _context: &mut Context<'_>,
    ) -> Poll<Result<(), network::NetworkEndpointError>> {
        self.sender.abort_send();
        self.sender.close();
        Poll::Ready(Ok(()))
    }
}

/// Independently composable in-memory Network Backend.
pub struct NetworkBackend {
    id: network::NetworkBackendId,
    endpoint: network::NetworkEndpointSelection,
    state: RefCell<NetworkBackendState>,
}

#[derive(Default)]
struct NetworkBackendState {
    attached: BTreeSet<SandboxId>,
    endpoints: BTreeMap<SandboxId, network::NetworkEndpoint>,
}

impl NetworkBackend {
    /// Creates a Network Backend selecting an explicit endpoint contract.
    #[must_use]
    pub fn for_endpoint(id: impl Into<String>, endpoint: network::NetworkEndpointSelection) -> Self {
        Self {
            id: network::NetworkBackendId::new(id),
            endpoint,
            state: RefCell::new(NetworkBackendState::default()),
        }
    }

    /// Reports whether one Sandbox retains Network Backend state.
    #[must_use]
    pub fn is_attached(&self, sandbox_id: &SandboxId) -> bool {
        self.state.borrow().attached.contains(sandbox_id)
    }
}

impl network::NetworkBackend for NetworkBackend {
    fn id(&self) -> network::NetworkBackendId {
        self.id.clone()
    }

    fn is_running(&self, sandbox_id: &SandboxId) -> bool {
        self.state.borrow().endpoints.contains_key(sandbox_id)
    }

    fn select_endpoint(
        &self,
        available: &network::NetworkEndpointCapabilities,
    ) -> Option<network::NetworkEndpointSelection> {
        available.supports(&self.endpoint).then(|| self.endpoint.clone())
    }

    fn start(&self, request: network::StartNetworkRequest) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            let actual = request.endpoint.selection();
            if actual != self.endpoint {
                return Err(Error::NetworkEndpointMismatch {
                    expected: self.endpoint.clone(),
                    actual,
                });
            }
            let mut state = self.state.borrow_mut();
            state.attached.insert(request.sandbox_id.clone());
            state.endpoints.insert(request.sandbox_id, request.endpoint);
            Ok(())
        })
    }

    fn stop<'a>(&'a self, sandbox_id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.state.borrow_mut().endpoints.remove(sandbox_id);
            Ok(())
        })
    }

    fn delete<'a>(&'a self, sandbox_id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            let mut state = self.state.borrow_mut();
            state.endpoints.remove(sandbox_id);
            state.attached.remove(sandbox_id);
            Ok(())
        })
    }
}

/// Deterministically resolves OCI Image Sources to synthetic digests.
#[derive(Default)]
pub struct MemoryImageBackend;

impl image::ImageBackend for MemoryImageBackend {
    fn capabilities<'a>(
        &'a self,
        _platform: &'a Platform,
    ) -> LocalFuture<'a, Result<image::ImageBackendCapabilities, Error>> {
        Box::pin(async {
            Ok(image::ImageBackendCapabilities::new(
                image::ImageOperationCapabilities::new(
                    [image::ImageSourceKind::Build, image::ImageSourceKind::Reference].into(),
                    [RootFilesystemMode::Layered, RootFilesystemMode::Direct].into(),
                ),
                image::ImageOperationCapabilities::default(),
                image::ImageOperationCapabilities::default(),
            ))
        })
    }

    fn resolve<'a>(&'a self, request: &'a image::ResolveRequest) -> PendingOperation<'a, image::ResolvedImage> {
        PendingOperation::run(SandboxPhase::ImageResolve, move |_progress| {
            Box::pin(async move {
                Ok(image::ResolvedImage {
                    source: request.source.clone(),
                    platform: request.platform.clone(),
                    manifest_digest: memory_manifest_digest(request),
                })
            })
        })
    }

    fn export_prepared_image<'a>(
        &'a self,
        _request: &'a image::ResolveRequest,
        _destination: &'a std::path::Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        unsupported_prepared_image(image::ImageOperation::PreparedImageExport)
    }

    fn import_prepared_image<'a>(
        &'a self,
        _request: &'a image::ResolveRequest,
        _source: &'a std::path::Path,
    ) -> PendingOperation<'a, image::PreparedImage> {
        unsupported_prepared_image(image::ImageOperation::PreparedImageImport)
    }
}

fn memory_manifest_digest(request: &image::ResolveRequest) -> String {
    let mut digest = Sha256::new();
    digest.update(b"sandbox.memory-image-manifest.v1\0");
    match &request.source {
        image::ImageSource::Build { context, dockerfile } => {
            update_digest_part(&mut digest, b"build");
            update_digest_part(&mut digest, context.as_os_str().as_encoded_bytes());
            update_digest_part(&mut digest, dockerfile.as_os_str().as_encoded_bytes());
        }
        image::ImageSource::Reference { reference } => {
            update_digest_part(&mut digest, b"reference");
            update_digest_part(&mut digest, reference.as_bytes());
        }
    }
    update_digest_part(&mut digest, request.platform.os.as_bytes());
    update_digest_part(&mut digest, request.platform.architecture.as_bytes());
    update_optional_digest_part(&mut digest, request.platform.variant.as_deref());
    update_optional_digest_part(&mut digest, request.platform.os_version.as_deref());
    for feature in &request.platform.os_features {
        update_digest_part(&mut digest, feature.as_bytes());
    }
    let mut encoded = String::with_capacity("sha256:".len() + 64);
    encoded.push_str("sha256:");
    for byte in digest.finalize() {
        const HEX: &[u8; 16] = b"0123456789abcdef";
        encoded.push(char::from(HEX[usize::from(byte >> 4)]));
        encoded.push(char::from(HEX[usize::from(byte & 0x0f)]));
    }
    encoded
}

fn update_optional_digest_part(digest: &mut Sha256, value: Option<&str>) {
    match value {
        Some(value) => {
            digest.update([1]);
            update_digest_part(digest, value.as_bytes());
        }
        None => digest.update([0]),
    }
}

fn update_digest_part(digest: &mut Sha256, value: &[u8]) {
    digest.update(value.len().to_le_bytes());
    digest.update(value);
}

fn unsupported_prepared_image<'a>(operation: image::ImageOperation) -> PendingOperation<'a, image::PreparedImage> {
    PendingOperation::run(SandboxPhase::ImagePrepare, move |_progress| {
        Box::pin(async move { Err(Error::UnsupportedImageOperation(operation)) })
    })
}

fn test_platform() -> Platform {
    let architecture = match std::env::consts::ARCH {
        "x86_64" => "amd64",
        "aarch64" => "arm64",
        architecture => architecture,
    };
    Platform::new("linux", architecture)
}

fn packet_properties(medium: network::PacketMedium) -> Result<network::PacketEndpointProperties, Error> {
    let mtu = NonZeroU32::new(1_500).ok_or_else(|| Error::Backend("invalid memory Network MTU".into()))?;
    let maximum_frame_length = NonZeroU32::new(match medium {
        network::PacketMedium::Ethernet => 1_514,
        network::PacketMedium::Ip => 1_500,
    })
    .ok_or_else(|| Error::Backend("invalid memory Network frame length".into()))?;
    let ipv4 = IpAddr::V4(Ipv4Addr::new(192, 0, 2, 2));
    let ipv6 = IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 0, 0, 0, 0, 2));
    let addresses = vec![
        network::InterfaceAddress::new(ipv4, 24)
            .map_err(|error| Error::Backend(format!("invalid memory IPv4 configuration: {error}")))?,
        network::InterfaceAddress::new(ipv6, 64)
            .map_err(|error| Error::Backend(format!("invalid memory IPv6 configuration: {error}")))?,
    ];
    let interface = network::NetworkInterfaceConfiguration::new(
        network::MacAddress::new([0x02, 0, 0, 0, 0, 2]),
        mtu,
        addresses,
        vec![
            IpAddr::V4(Ipv4Addr::new(192, 0, 2, 1)),
            IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 0, 0, 0, 0, 1)),
        ],
        vec![
            IpAddr::V4(Ipv4Addr::new(192, 0, 2, 53)),
            IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 0, 0, 0, 0, 53)),
        ],
    );
    Ok(network::PacketEndpointProperties::new(
        medium,
        interface,
        maximum_frame_length,
    ))
}
