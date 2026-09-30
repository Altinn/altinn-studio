//! Independently implemented networking attached to a Sandbox at creation.

use std::{
    collections::{BTreeSet, VecDeque},
    net::{IpAddr, SocketAddr},
    num::{NonZeroU32, NonZeroUsize},
    pin::Pin,
    task::{Context, Poll},
};

use bytes::Bytes;
use serde::{Deserialize, Serialize};
use thiserror::Error as ThisError;
use tokio::io::{AsyncRead, AsyncWrite};

use crate::{Error, LocalFuture, SandboxId, SandboxName};

/// Stable identity of one configured Network Backend.
///
/// The identity is stored with the Sandbox so another implementation cannot be
/// substituted without recreating it.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct NetworkBackendId(String);

impl NetworkBackendId {
    /// Creates a stable Network Backend identity.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// Returns the identity as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for NetworkBackendId {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

/// Packet representation exposed by a Sandbox Backend.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PacketMedium {
    /// Complete Ethernet frames without a frame check sequence.
    Ethernet,
    /// Complete IPv4 or IPv6 packets without a link-layer header.
    Ip,
}

/// Stable identity of a versioned control protocol implemented by a Sandbox Backend.
///
/// The protocol remains opaque to the generic Sandbox SDK. Its concrete
/// Sandbox and Network Backend implementations jointly define the messages and
/// their semantics.
#[derive(Clone, Debug, Deserialize, Eq, Hash, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(transparent)]
pub struct NetworkControlProtocolId(String);

impl NetworkControlProtocolId {
    /// Creates a control protocol identity.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// Returns the identity as text.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for NetworkControlProtocolId {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.0)
    }
}

/// Network endpoint forms a Sandbox Backend can expose.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct NetworkEndpointCapabilities {
    packet_media: BTreeSet<PacketMedium>,
    intercepted: bool,
    control_protocols: BTreeSet<NetworkControlProtocolId>,
}

impl NetworkEndpointCapabilities {
    /// Creates an empty set of endpoint capabilities.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            packet_media: BTreeSet::new(),
            intercepted: false,
            control_protocols: BTreeSet::new(),
        }
    }

    /// Adds a packet medium.
    #[must_use]
    pub fn with_packet_medium(mut self, medium: PacketMedium) -> Self {
        self.packet_media.insert(medium);
        self
    }

    /// Adds intercepted TCP-stream and UDP-datagram support.
    #[must_use]
    pub const fn with_intercepted(mut self) -> Self {
        self.intercepted = true;
        self
    }

    /// Adds a versioned control protocol.
    #[must_use]
    pub fn with_control_protocol(mut self, protocol: NetworkControlProtocolId) -> Self {
        self.control_protocols.insert(protocol);
        self
    }

    /// Reports whether no packet or intercepted endpoint is available.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.packet_media.is_empty() && !self.intercepted && self.control_protocols.is_empty()
    }

    /// Reports whether the Sandbox Backend can materialize a selection.
    #[must_use]
    pub fn supports(&self, selection: &NetworkEndpointSelection) -> bool {
        match selection {
            NetworkEndpointSelection::Packet(medium) => self.packet_media.contains(medium),
            NetworkEndpointSelection::Intercepted => self.intercepted,
            NetworkEndpointSelection::Control(protocol) => self.control_protocols.contains(protocol),
        }
    }

    /// Iterates over available packet media in stable order.
    pub fn packet_media(&self) -> impl Iterator<Item = PacketMedium> + '_ {
        self.packet_media.iter().copied()
    }

    /// Reports whether intercepted TCP streams and UDP datagrams are available.
    #[must_use]
    pub const fn supports_intercepted(&self) -> bool {
        self.intercepted
    }

    /// Iterates over available control protocols in stable order.
    pub fn control_protocols(&self) -> impl Iterator<Item = &NetworkControlProtocolId> {
        self.control_protocols.iter()
    }
}

/// Immutable endpoint contract selected for one Sandbox Network.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NetworkEndpointSelection {
    /// Exchange raw packets in the selected representation.
    Packet(PacketMedium),
    /// Exchange intercepted TCP streams and UDP datagrams.
    Intercepted,
    /// Exchange messages using a jointly implemented, versioned control protocol.
    Control(NetworkControlProtocolId),
}

/// Immutable association between a Sandbox, Network Backend and endpoint contract.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct NetworkAttachment {
    /// Network Backend selected when the Sandbox was created.
    pub backend: NetworkBackendId,
    /// Endpoint contract negotiated when the Sandbox was created.
    pub endpoint: NetworkEndpointSelection,
}

/// A bounded, reusable queue used by Network endpoint operations.
///
/// A receiver appends items and a sender removes accepted items from the front.
/// Keeping the allocation in the caller lets successive polls reuse it and
/// bounds the work performed in one poll.
#[derive(Debug)]
pub struct NetworkBatch<T> {
    items: VecDeque<T>,
    limit: NonZeroUsize,
}

impl<T> NetworkBatch<T> {
    /// Creates an empty batch with a fixed item limit.
    #[must_use]
    pub fn new(limit: NonZeroUsize) -> Self {
        Self {
            items: VecDeque::with_capacity(limit.get()),
            limit,
        }
    }

    /// Returns the maximum number of items held by this batch.
    #[must_use]
    pub const fn limit(&self) -> NonZeroUsize {
        self.limit
    }

    /// Returns the current number of items.
    #[must_use]
    pub fn len(&self) -> usize {
        self.items.len()
    }

    /// Returns whether the batch contains no items.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    /// Returns whether the batch has reached its fixed limit.
    #[must_use]
    pub fn is_full(&self) -> bool {
        self.items.len() == self.limit.get()
    }

    /// Returns the number of items that can still be appended.
    #[must_use]
    pub fn remaining(&self) -> usize {
        self.limit.get() - self.items.len()
    }

    /// Appends an item, returning it unchanged when the batch is full.
    ///
    /// # Errors
    ///
    /// Returns the supplied item when the batch is already full.
    pub fn push_back(&mut self, item: T) -> Result<(), T> {
        if self.is_full() {
            Err(item)
        } else {
            self.items.push_back(item);
            Ok(())
        }
    }

    /// Prepends an item, returning it unchanged when the batch is full.
    ///
    /// # Errors
    ///
    /// Returns the supplied item when the batch is already full.
    pub fn push_front(&mut self, item: T) -> Result<(), T> {
        if self.is_full() {
            Err(item)
        } else {
            self.items.push_front(item);
            Ok(())
        }
    }

    /// Returns the first item without removing it.
    #[must_use]
    pub fn front(&self) -> Option<&T> {
        self.items.front()
    }

    /// Removes and returns the first item.
    pub fn pop_front(&mut self) -> Option<T> {
        self.items.pop_front()
    }
}

/// One complete packet transferred across a [`PacketEndpoint`].
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NetworkPacket(Bytes);

impl NetworkPacket {
    /// Wraps the bytes of one complete packet.
    #[must_use]
    pub fn new(bytes: impl Into<Bytes>) -> Self {
        Self(bytes.into())
    }

    /// Returns the packet bytes.
    #[must_use]
    pub const fn as_bytes(&self) -> &Bytes {
        &self.0
    }

    /// Consumes the packet and returns its bytes.
    #[must_use]
    pub fn into_bytes(self) -> Bytes {
        self.0
    }

    /// Returns the complete packet length.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.0.len()
    }

    /// Returns whether the packet has no bytes.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

impl AsRef<[u8]> for NetworkPacket {
    fn as_ref(&self) -> &[u8] {
        self.0.as_ref()
    }
}

impl From<Bytes> for NetworkPacket {
    fn from(bytes: Bytes) -> Self {
        Self(bytes)
    }
}

/// A bounded batch of raw packets.
pub type NetworkPacketBatch = NetworkBatch<NetworkPacket>;

/// Six-octet MAC address assigned to a Sandbox network interface.
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(transparent)]
pub struct MacAddress([u8; 6]);

impl MacAddress {
    /// Creates a MAC address from its six octets.
    #[must_use]
    pub const fn new(octets: [u8; 6]) -> Self {
        Self(octets)
    }

    /// Returns the six address octets.
    #[must_use]
    pub const fn octets(self) -> [u8; 6] {
        self.0
    }
}

impl std::fmt::Display for MacAddress {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let octets = self.0;
        write!(
            formatter,
            "{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
            octets[0], octets[1], octets[2], octets[3], octets[4], octets[5]
        )
    }
}

/// An IP address assigned to an interface and its routing prefix length.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct InterfaceAddress {
    address: IpAddr,
    prefix_length: u8,
}

impl InterfaceAddress {
    /// Creates an interface address when the prefix fits its IP family.
    ///
    /// # Errors
    ///
    /// Returns [`InvalidPrefixLength`] for IPv4 prefixes above 32 or IPv6
    /// prefixes above 128.
    pub const fn new(address: IpAddr, prefix_length: u8) -> Result<Self, InvalidPrefixLength> {
        let maximum = if address.is_ipv4() { 32 } else { 128 };
        if prefix_length > maximum {
            Err(InvalidPrefixLength { address, prefix_length })
        } else {
            Ok(Self { address, prefix_length })
        }
    }

    /// Returns the assigned IPv4 or IPv6 address.
    #[must_use]
    pub const fn address(self) -> IpAddr {
        self.address
    }

    /// Returns the CIDR prefix length.
    #[must_use]
    pub const fn prefix_length(self) -> u8 {
        self.prefix_length
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct SerializedInterfaceAddress {
    address: IpAddr,
    prefix_length: u8,
}

impl<'de> Deserialize<'de> for InterfaceAddress {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = SerializedInterfaceAddress::deserialize(deserializer)?;
        Self::new(value.address, value.prefix_length).map_err(serde::de::Error::custom)
    }
}

/// An interface prefix length that is invalid for its IP family.
#[derive(Clone, Copy, Debug, Eq, PartialEq, ThisError)]
#[error("prefix length {prefix_length} is invalid for {address}")]
pub struct InvalidPrefixLength {
    address: IpAddr,
    prefix_length: u8,
}

/// Immutable network configuration assigned by a Sandbox Backend.
///
/// This is the small, backend-neutral equivalent of a CNI result. The Sandbox
/// Backend persists it with the materialization and every compatible packet
/// Network Backend consumes the same values.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct NetworkInterfaceConfiguration {
    mac_address: MacAddress,
    mtu: NonZeroU32,
    addresses: Vec<InterfaceAddress>,
    default_gateways: Vec<IpAddr>,
    dns_servers: Vec<IpAddr>,
}

impl NetworkInterfaceConfiguration {
    /// Creates immutable Sandbox interface configuration.
    #[must_use]
    pub const fn new(
        mac_address: MacAddress,
        mtu: NonZeroU32,
        addresses: Vec<InterfaceAddress>,
        default_gateways: Vec<IpAddr>,
        dns_servers: Vec<IpAddr>,
    ) -> Self {
        Self {
            mac_address,
            mtu,
            addresses,
            default_gateways,
            dns_servers,
        }
    }

    /// Returns the MAC address configured inside the Sandbox.
    #[must_use]
    pub const fn mac_address(&self) -> MacAddress {
        self.mac_address
    }

    /// Returns the interface maximum transmission unit.
    #[must_use]
    pub const fn mtu(&self) -> NonZeroU32 {
        self.mtu
    }

    /// Returns all IPv4 and IPv6 addresses assigned to the interface.
    #[must_use]
    pub fn addresses(&self) -> &[InterfaceAddress] {
        &self.addresses
    }

    /// Returns default gateways for the configured address families.
    #[must_use]
    pub fn default_gateways(&self) -> &[IpAddr] {
        &self.default_gateways
    }

    /// Returns DNS server addresses supplied to the Sandbox.
    #[must_use]
    pub fn dns_servers(&self) -> &[IpAddr] {
        &self.dns_servers
    }
}

/// Immutable properties shared by both directions of a packet endpoint.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct PacketEndpointProperties {
    medium: PacketMedium,
    interface: NetworkInterfaceConfiguration,
    maximum_frame_length: NonZeroU32,
}

impl PacketEndpointProperties {
    /// Creates packet endpoint properties.
    #[must_use]
    pub const fn new(
        medium: PacketMedium,
        interface: NetworkInterfaceConfiguration,
        maximum_frame_length: NonZeroU32,
    ) -> Self {
        Self {
            medium,
            interface,
            maximum_frame_length,
        }
    }

    /// Returns the packet representation used by the endpoint.
    #[must_use]
    pub const fn medium(&self) -> PacketMedium {
        self.medium
    }

    /// Returns the Sandbox interface configuration chosen by the Backend.
    #[must_use]
    pub const fn interface(&self) -> &NetworkInterfaceConfiguration {
        &self.interface
    }

    /// Returns the maximum complete frame or IP packet length accepted by the endpoint.
    #[must_use]
    pub const fn maximum_frame_length(&self) -> NonZeroU32 {
        self.maximum_frame_length
    }
}

/// An error encountered while driving a Network endpoint.
#[derive(Debug, ThisError)]
pub enum NetworkEndpointError {
    /// The caller supplied a full receive batch, so no progress was possible.
    #[error("cannot receive Network items into a full batch")]
    FullReceiveBatch,
    /// The caller supplied an empty send batch, so no progress was possible.
    #[error("cannot send Network items from an empty batch")]
    EmptySendBatch,
    /// A packet exceeded the maximum length supported by the endpoint.
    #[error("Network packet length {actual} exceeds endpoint maximum {maximum}")]
    PacketTooLarge {
        /// Actual complete packet length.
        actual: usize,
        /// Maximum complete packet length supported by the endpoint.
        maximum: usize,
    },
    /// A control message exceeded the maximum length supported by the endpoint.
    #[error("Network control message length {actual} exceeds endpoint maximum {maximum}")]
    ControlMessageTooLarge {
        /// Actual complete message length.
        actual: usize,
        /// Maximum complete message length supported by the endpoint.
        maximum: usize,
    },
    /// The Sandbox-facing endpoint closed during an operation.
    #[error("Sandbox Network endpoint is closed")]
    Closed,
    /// A platform I/O operation failed.
    #[error("{operation}: {source}")]
    Io {
        /// Operation being performed.
        operation: &'static str,
        /// Underlying platform error.
        #[source]
        source: std::io::Error,
    },
    /// An endpoint implementation failed without a more specific portable representation.
    #[error("Network endpoint implementation error: {0}")]
    Backend(String),
}

/// Progress made during a bounded Network transfer operation.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NetworkTransferProgress {
    /// One or more items were transferred.
    Items(NonZeroUsize),
    /// The Sandbox-facing direction closed after queued items were drained.
    Closed,
}

/// Receives a bounded batch of Network items emitted by a Sandbox.
///
/// Implementations append no more than [`NetworkBatch::remaining`] items.
/// They register the current waker before returning [`Poll::Pending`] and
/// return progress instead of `Pending` after appending any items.
pub trait BatchReceiver<T> {
    /// Polls for a bounded batch of items.
    fn poll_receive(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
        output: &mut NetworkBatch<T>,
    ) -> Poll<Result<NetworkTransferProgress, NetworkEndpointError>>;
}

/// Sends a bounded batch of Network items to a Sandbox with explicit backpressure.
///
/// Implementations remove only accepted items from the front of `pending`.
/// They register the current waker before returning [`Poll::Pending`] and
/// return progress instead of `Pending` after accepting any items.
pub trait BatchSender<T> {
    /// Polls to accept a bounded batch of items for the Sandbox.
    fn poll_send(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
        pending: &mut NetworkBatch<T>,
    ) -> Poll<Result<NetworkTransferProgress, NetworkEndpointError>>;

    /// Polls until every accepted item has been flushed.
    fn poll_flush(self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<Result<(), NetworkEndpointError>>;

    /// Gracefully and idempotently closes the direction used to send items.
    fn poll_shutdown(self: Pin<&mut Self>, context: &mut Context<'_>) -> Poll<Result<(), NetworkEndpointError>>;
}

/// Independently driven directions of a [`PacketEndpoint`].
pub struct PacketEndpointParts {
    /// Properties applying to both directions.
    pub properties: PacketEndpointProperties,
    /// Packets emitted by the Sandbox and consumed by the Network Backend.
    pub from_sandbox: Pin<Box<dyn BatchReceiver<NetworkPacket> + Send>>,
    /// Packets emitted by the Network Backend and consumed by the Sandbox.
    pub to_sandbox: Pin<Box<dyn BatchSender<NetworkPacket> + Send>>,
}

/// Owned, bidirectional raw-packet endpoint exposed by a Sandbox Backend.
pub struct PacketEndpoint {
    parts: PacketEndpointParts,
}

impl PacketEndpoint {
    /// Combines independently implemented receive and send directions.
    #[must_use]
    pub fn new<R, S>(properties: PacketEndpointProperties, from_sandbox: R, to_sandbox: S) -> Self
    where
        R: BatchReceiver<NetworkPacket> + Send + 'static,
        S: BatchSender<NetworkPacket> + Send + 'static,
    {
        Self {
            parts: PacketEndpointParts {
                properties,
                from_sandbox: Box::pin(from_sandbox),
                to_sandbox: Box::pin(to_sandbox),
            },
        }
    }

    /// Returns properties applying to both endpoint directions.
    #[must_use]
    pub const fn properties(&self) -> &PacketEndpointProperties {
        &self.parts.properties
    }

    /// Splits the endpoint into directions that can be driven independently.
    #[must_use]
    pub fn into_parts(self) -> PacketEndpointParts {
        self.parts
    }
}

/// One opaque message transferred across a [`NetworkControlEndpoint`].
#[derive(Clone, Eq, PartialEq)]
pub struct NetworkControlMessage(zeroize::Zeroizing<Vec<u8>>);

impl NetworkControlMessage {
    /// Wraps one complete protocol message.
    #[must_use]
    pub fn new(bytes: impl AsRef<[u8]>) -> Self {
        Self(zeroize::Zeroizing::new(bytes.as_ref().to_vec()))
    }

    /// Returns the complete message bytes.
    #[must_use]
    pub fn as_bytes(&self) -> &[u8] {
        self.0.as_slice()
    }

    /// Consumes the message and returns its bytes.
    #[must_use]
    pub fn into_bytes(self) -> zeroize::Zeroizing<Vec<u8>> {
        self.0
    }

    /// Returns the complete message length.
    #[must_use]
    pub fn len(&self) -> usize {
        self.0.len()
    }

    /// Returns whether the message contains no bytes.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

impl AsRef<[u8]> for NetworkControlMessage {
    fn as_ref(&self) -> &[u8] {
        self.0.as_ref()
    }
}

impl std::fmt::Debug for NetworkControlMessage {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("NetworkControlMessage")
            .field("length", &self.len())
            .finish_non_exhaustive()
    }
}

impl From<Bytes> for NetworkControlMessage {
    fn from(bytes: Bytes) -> Self {
        Self::new(bytes)
    }
}

impl From<zeroize::Zeroizing<Vec<u8>>> for NetworkControlMessage {
    fn from(bytes: zeroize::Zeroizing<Vec<u8>>) -> Self {
        Self(bytes)
    }
}

/// A bounded batch of opaque Network control messages.
pub type NetworkControlMessageBatch = NetworkBatch<NetworkControlMessage>;

/// Immutable properties shared by both directions of a control endpoint.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NetworkControlEndpointProperties {
    protocol: NetworkControlProtocolId,
    maximum_message_length: NonZeroUsize,
}

impl NetworkControlEndpointProperties {
    /// Creates control endpoint properties.
    #[must_use]
    pub const fn new(protocol: NetworkControlProtocolId, maximum_message_length: NonZeroUsize) -> Self {
        Self {
            protocol,
            maximum_message_length,
        }
    }

    /// Returns the jointly implemented protocol identity.
    #[must_use]
    pub const fn protocol(&self) -> &NetworkControlProtocolId {
        &self.protocol
    }

    /// Returns the maximum complete control message length.
    #[must_use]
    pub const fn maximum_message_length(&self) -> NonZeroUsize {
        self.maximum_message_length
    }
}

/// Independently driven directions of a [`NetworkControlEndpoint`].
pub struct NetworkControlEndpointParts {
    /// Properties applying to both directions.
    pub properties: NetworkControlEndpointProperties,
    /// Messages emitted by the Sandbox Backend's trusted runtime.
    pub from_sandbox: Pin<Box<dyn BatchReceiver<NetworkControlMessage> + Send>>,
    /// Messages returned by the Network Backend to the trusted runtime.
    pub to_sandbox: Pin<Box<dyn BatchSender<NetworkControlMessage> + Send>>,
}

/// Owned endpoint for a versioned protocol between compatible Sandbox and Network Backends.
pub struct NetworkControlEndpoint {
    parts: NetworkControlEndpointParts,
}

impl NetworkControlEndpoint {
    /// Combines independently implemented receive and send directions.
    #[must_use]
    pub fn new<R, S>(properties: NetworkControlEndpointProperties, from_sandbox: R, to_sandbox: S) -> Self
    where
        R: BatchReceiver<NetworkControlMessage> + Send + 'static,
        S: BatchSender<NetworkControlMessage> + Send + 'static,
    {
        Self {
            parts: NetworkControlEndpointParts {
                properties,
                from_sandbox: Box::pin(from_sandbox),
                to_sandbox: Box::pin(to_sandbox),
            },
        }
    }

    /// Returns properties applying to both endpoint directions.
    #[must_use]
    pub const fn properties(&self) -> &NetworkControlEndpointProperties {
        &self.parts.properties
    }

    /// Splits the endpoint into directions that can be driven independently.
    #[must_use]
    pub fn into_parts(self) -> NetworkControlEndpointParts {
        self.parts
    }
}

/// Network destination identified by either an address or a host name.
#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub enum NetworkHost {
    /// An IPv4 or IPv6 address.
    Ip(IpAddr),
    /// A name supplied by the intercepted connection mechanism.
    Name(String),
}

/// Destination of an intercepted transport-layer flow.
#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct NetworkDestination {
    /// Destination host or address.
    pub host: NetworkHost,
    /// Destination transport port.
    pub port: u16,
}

/// Bidirectional byte stream carried by an intercepted endpoint.
pub trait NetworkByteStream: AsyncRead + AsyncWrite {}

impl<T> NetworkByteStream for T where T: AsyncRead + AsyncWrite + ?Sized {}

/// One outbound stream accepted from a Sandbox.
pub struct OutboundStream {
    /// Source address when the Sandbox Backend can report it.
    pub source: Option<SocketAddr>,
    /// Original destination requested by the Sandbox.
    pub destination: NetworkDestination,
    /// Bidirectional stream bytes.
    pub stream: Pin<Box<dyn NetworkByteStream + Send>>,
}

/// Identifies a datagram flow for routing responses back to a Sandbox.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub struct DatagramFlowId(u64);

impl DatagramFlowId {
    /// Creates a flow identifier scoped to one live intercepted endpoint.
    #[must_use]
    pub const fn new(value: u64) -> Self {
        Self(value)
    }
}

/// One datagram emitted by a Sandbox.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OutboundDatagram {
    /// Opaque route used to deliver a response to the originating flow.
    pub flow: DatagramFlowId,
    /// Source address when the Sandbox Backend can report it.
    pub source: Option<SocketAddr>,
    /// Original destination requested by the Sandbox.
    pub destination: NetworkDestination,
    /// Complete transport payload.
    pub payload: Bytes,
}

/// One datagram returned to a Sandbox flow.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InboundDatagram {
    /// Opaque route copied from an outbound datagram.
    pub flow: DatagramFlowId,
    /// Complete transport payload.
    pub payload: Bytes,
}

/// A bounded batch of datagrams emitted by a Sandbox.
pub type OutboundDatagramBatch = NetworkBatch<OutboundDatagram>;

/// A bounded batch of datagrams returned to a Sandbox.
pub type InboundDatagramBatch = NetworkBatch<InboundDatagram>;

/// Accepts intercepted outbound TCP streams from a Sandbox.
pub trait StreamAcceptor {
    /// Polls for the next outbound stream, or `None` after stream interception closes.
    ///
    /// The implementation registers the current waker before returning
    /// [`Poll::Pending`].
    fn poll_accept(
        self: Pin<&mut Self>,
        context: &mut Context<'_>,
    ) -> Poll<Result<Option<OutboundStream>, NetworkEndpointError>>;
}

/// Independently driven directions of a [`DatagramEndpoint`].
pub struct DatagramEndpointParts {
    /// UDP datagrams emitted by the Sandbox and consumed by the Network Backend.
    pub from_sandbox: Pin<Box<dyn BatchReceiver<OutboundDatagram> + Send>>,
    /// UDP datagrams emitted by the Network Backend and consumed by the Sandbox.
    pub to_sandbox: Pin<Box<dyn BatchSender<InboundDatagram> + Send>>,
}

/// Owned, bidirectional endpoint for intercepted UDP datagrams.
pub struct DatagramEndpoint {
    parts: DatagramEndpointParts,
}

impl DatagramEndpoint {
    /// Combines independently implemented receive and send directions.
    #[must_use]
    pub fn new<R, S>(from_sandbox: R, to_sandbox: S) -> Self
    where
        R: BatchReceiver<OutboundDatagram> + Send + 'static,
        S: BatchSender<InboundDatagram> + Send + 'static,
    {
        Self {
            parts: DatagramEndpointParts {
                from_sandbox: Box::pin(from_sandbox),
                to_sandbox: Box::pin(to_sandbox),
            },
        }
    }

    /// Splits the endpoint into directions that can be driven independently.
    #[must_use]
    pub fn into_parts(self) -> DatagramEndpointParts {
        self.parts
    }
}

/// Independently driven parts of an [`InterceptedEndpoint`].
pub struct InterceptedEndpointParts {
    /// Intercepted outbound TCP streams.
    pub streams: Pin<Box<dyn StreamAcceptor + Send>>,
    /// Intercepted bidirectional UDP datagrams.
    pub datagrams: DatagramEndpoint,
}

/// Owned endpoint exposing intercepted TCP streams and UDP datagrams.
pub struct InterceptedEndpoint {
    parts: InterceptedEndpointParts,
}

impl InterceptedEndpoint {
    /// Combines TCP stream acceptance with a UDP datagram endpoint.
    #[must_use]
    pub fn new<A>(streams: A, datagrams: DatagramEndpoint) -> Self
    where
        A: StreamAcceptor + Send + 'static,
    {
        Self {
            parts: InterceptedEndpointParts {
                streams: Box::pin(streams),
                datagrams,
            },
        }
    }

    /// Splits the endpoint into independently driven TCP and UDP parts.
    #[must_use]
    pub fn into_parts(self) -> InterceptedEndpointParts {
        self.parts
    }
}

/// Owned Network data plane opened by a Sandbox Backend.
pub enum NetworkEndpoint {
    /// Raw Ethernet or IP packet exchange.
    Packet(PacketEndpoint),
    /// Intercepted TCP streams and UDP datagrams.
    Intercepted(InterceptedEndpoint),
    /// Versioned control integration with a trusted Sandbox runtime.
    Control(NetworkControlEndpoint),
}

impl NetworkEndpoint {
    /// Returns the immutable contract represented by this endpoint.
    #[must_use]
    pub fn selection(&self) -> NetworkEndpointSelection {
        match self {
            Self::Packet(endpoint) => NetworkEndpointSelection::Packet(endpoint.properties().medium()),
            Self::Intercepted(_) => NetworkEndpointSelection::Intercepted,
            Self::Control(endpoint) => NetworkEndpointSelection::Control(endpoint.properties().protocol().clone()),
        }
    }
}

/// Inputs for starting or reconnecting one Sandbox's Network Backend.
pub struct StartNetworkRequest {
    /// Sandbox whose immutable Network attachment is being started.
    pub sandbox_id: SandboxId,
    /// Stable name used for caller-owned Network Backend configuration.
    pub sandbox_name: SandboxName,
    /// Fresh data-plane endpoint opened by the Sandbox Backend.
    pub endpoint: NetworkEndpoint,
}

/// Implements network processing and enforcement independently of a Sandbox Backend.
///
/// Implementations may use `sandbox-authorization`, a Secret Store, and their
/// own protocol-specific policy enforcement without adding those concerns to
/// the generic Sandbox lifecycle contract.
pub trait NetworkBackend {
    /// Returns the stable identity persisted in each attached Sandbox.
    fn id(&self) -> NetworkBackendId;

    /// Reports whether this process already drives the Sandbox's live endpoint.
    ///
    /// The lifecycle service uses this to keep repeated reconciliation
    /// idempotent without opening a second endpoint. A newly started control
    /// plane returns `false` and re-establishes the retained attachment.
    fn is_running(&self, sandbox_id: &SandboxId) -> bool;

    /// Selects one endpoint contract from those offered by a Sandbox Backend.
    ///
    /// The implementation owns preference and completeness requirements. For
    /// example, one implementation may require Ethernet packets while another
    /// requires both intercepted TCP streams and UDP datagrams.
    ///
    /// Returns `None` when no offered endpoint can meet the Network Backend's requirements.
    fn select_endpoint(&self, available: &NetworkEndpointCapabilities) -> Option<NetworkEndpointSelection>;

    /// Starts or reconnects the Network attached to a Sandbox.
    ///
    /// This operation must be idempotent for the same Sandbox and attachment.
    /// It takes unique ownership of the fresh endpoint and returns only after
    /// the Network Backend is ready to process Sandbox traffic.
    fn start(&self, request: StartNetworkRequest) -> LocalFuture<'_, Result<(), Error>>;

    /// Stops live network processing while retaining the immutable attachment.
    fn stop<'a>(&'a self, sandbox_id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>>;

    /// Deletes all Network Backend state belonging to a deleted Sandbox.
    fn delete<'a>(&'a self, sandbox_id: &'a SandboxId) -> LocalFuture<'a, Result<(), Error>>;
}
