//! Sandbox-resident Agent Runtime building blocks.
//!
//! The runtime owns Session and Run state. Harness Adapters translate stable
//! operations for one harness family; Session Drivers operate replaceable PTY,
//! multiplexer, or direct-protocol mechanisms.

use std::{future::Future, pin::Pin, rc::Rc};

use agent_runtime_protocol::{HarnessInstallation, Prompt, SessionId, SteerRunRequest};
use thiserror::Error;

/// A non-`Send` future executed by a Tokio local runtime.
pub type LocalFuture<'a, T> = Pin<Box<dyn Future<Output = T> + 'a>>;

/// Agent Runtime failures normalized above harness and driver implementations.
#[derive(Debug, Error)]
pub enum Error {
    /// A requested harness installation is unavailable.
    #[error("Harness Installation not found")]
    HarnessInstallationNotFound,
    /// Harness-specific translation or state parsing failed.
    #[error("Harness Adapter failed: {0}")]
    HarnessAdapter(String),
    /// The Session operating mechanism failed.
    #[error("Session Driver failed: {0}")]
    SessionDriver(String),
}

/// Operates the mechanism hosting one Session without assigning harness semantics.
pub trait SessionDriver {
    /// Starts or resumes the mechanism for a Session.
    fn start<'a>(&'a self, session_id: &'a SessionId) -> LocalFuture<'a, Result<(), Error>>;

    /// Writes raw input understood by the harness process or protocol.
    fn write<'a>(&'a self, bytes: &'a [u8]) -> LocalFuture<'a, Result<(), Error>>;

    /// Reads the next available raw output.
    fn read(&self) -> LocalFuture<'_, Result<Vec<u8>, Error>>;

    /// Stops the mechanism while retaining recoverable Session state.
    fn stop(&self) -> LocalFuture<'_, Result<(), Error>>;
}

/// Translates stable Session and Run operations for one supported harness installation.
pub trait HarnessAdapter {
    /// Describes the installed executable and optional Session Features.
    fn installation(&self) -> &HarnessInstallation;

    /// Initializes harness state for a Runtime-owned Session using a replaceable Driver.
    fn initialize_session<'a>(
        &'a self,
        session_id: &'a SessionId,
        driver: Rc<dyn SessionDriver>,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Translates and submits the initial Prompt for a queued Run.
    fn submit_prompt<'a>(
        &'a self,
        driver: &'a dyn SessionDriver,
        prompt: &'a Prompt,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Translates additional input for the active Run.
    fn steer<'a>(
        &'a self,
        driver: &'a dyn SessionDriver,
        request: &'a SteerRunRequest,
    ) -> LocalFuture<'a, Result<(), Error>>;
}
