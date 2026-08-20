//! Harness-neutral Session and Run API exposed by an Agent Control Plane.

use agent_runtime_protocol::{ControlLease, Event, EventSequence, Run, RunId, Session, SessionId, SteerRunRequest};
use sandbox::LocalFuture;

use crate::Error;

/// Selects an Agent and Agent Runtime request when creating a Session.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CreateSessionRequest {
    /// Agent whose Runtime will own the Session.
    pub agent_name: String,
    /// Sandbox-local Session request forwarded over the Agent Runtime Protocol.
    pub runtime: agent_runtime_protocol::CreateSessionRequest,
}

/// Selects an Agent and Agent Runtime request when creating a Run.
#[derive(Clone, Debug, serde::Deserialize, Eq, PartialEq, serde::Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CreateRunRequest {
    /// Agent whose Runtime owns the Session.
    pub agent_name: String,
    /// Sandbox-local Run request forwarded over the Agent Runtime Protocol.
    pub runtime: agent_runtime_protocol::CreateRunRequest,
}

/// Stable Session and Run operations independent of Harness Adapter and Session Driver implementations.
pub trait SessionApi {
    /// Creates a sandbox-owned Session.
    fn create_session(&self, request: CreateSessionRequest) -> LocalFuture<'_, Result<Session, Error>>;

    /// Gets one Session.
    fn get_session<'a>(
        &'a self,
        agent_name: &'a str,
        session_id: &'a SessionId,
    ) -> LocalFuture<'a, Result<Session, Error>>;

    /// Lists Sessions owned by one Agent Runtime.
    fn list_sessions<'a>(&'a self, agent_name: &'a str) -> LocalFuture<'a, Result<Vec<Session>, Error>>;

    /// Stops a retained Session.
    fn stop_session<'a>(&'a self, agent_name: &'a str, session_id: &'a SessionId)
    -> LocalFuture<'a, Result<(), Error>>;

    /// Starts or resumes a retained Session.
    fn start_session<'a>(
        &'a self,
        agent_name: &'a str,
        session_id: &'a SessionId,
    ) -> LocalFuture<'a, Result<Session, Error>>;

    /// Queues a Prompt as an addressable Run.
    fn create_run(&self, request: CreateRunRequest) -> LocalFuture<'_, Result<Run, Error>>;

    /// Gets one Run.
    fn get_run<'a>(
        &'a self,
        agent_name: &'a str,
        session_id: &'a SessionId,
        run_id: &'a RunId,
    ) -> LocalFuture<'a, Result<Run, Error>>;

    /// Lists addressable Runs in one Session.
    fn list_runs<'a>(
        &'a self,
        agent_name: &'a str,
        session_id: &'a SessionId,
    ) -> LocalFuture<'a, Result<Vec<Run>, Error>>;

    /// Cancels a queued or active Run.
    fn cancel_run<'a>(
        &'a self,
        agent_name: &'a str,
        session_id: &'a SessionId,
        run_id: &'a RunId,
    ) -> LocalFuture<'a, Result<Run, Error>>;

    /// Sends additional input to the active Run under a valid Control Lease.
    fn steer<'a>(
        &'a self,
        agent_name: &'a str,
        lease: &'a ControlLease,
        request: &'a SteerRunRequest,
    ) -> LocalFuture<'a, Result<(), Error>>;

    /// Observes events after a cursor without acquiring the Control Lease.
    fn events<'a>(&'a self, agent_name: &'a str, after: EventSequence) -> LocalFuture<'a, Result<Vec<Event>, Error>>;

    /// Acquires exclusive steering rights for one client.
    fn acquire_control<'a>(
        &'a self,
        agent_name: &'a str,
        session_id: &'a SessionId,
        holder: &'a str,
    ) -> LocalFuture<'a, Result<ControlLease, Error>>;

    /// Releases exclusive steering rights.
    fn release_control<'a>(
        &'a self,
        agent_name: &'a str,
        lease: &'a ControlLease,
    ) -> LocalFuture<'a, Result<(), Error>>;
}
