//! Versioned Agent Control API with JSON-RPC 2.0/JSONL and replaceable stream transports.

mod client;
mod endpoint;
mod protocol;
mod server;
mod socket;
mod tcp;

pub use client::{
    AttachedExecution, AttachedTerminal, Client, Connection, Connector, ExecutionEvents, PortForwardBinding,
    PortForwardEvent, PortForwardEvents, PortForwardSession, TerminalEvents, TerminalInput,
};
pub use endpoint::TcpEndpoint;
pub use protocol::{PROTOCOL_VERSION, ResponseError};
pub use server::{
    AgentApi, AttachmentApi, AuthenticationApi, Caller, ErrorHandler, ExecutionApi, PortForwardApi, Server, SessionApi,
};
