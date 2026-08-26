//! Versioned Agent Control API with JSON-RPC 2.0/JSONL and replaceable stream transports.

mod client;
mod protocol;
mod server;
mod socket;

pub use client::{Client, Connection, Connector};
pub use protocol::{PROTOCOL_VERSION, ResponseError};
pub use server::{AgentApi, AuthenticationApi, ErrorHandler, ExecutionApi, Server, SessionApi};
