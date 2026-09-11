//! Session runtime seam: how a harness is carried inside a Sandbox.
//!
//! The runtime owns process lifecycle, terminal state, operator input and the
//! conversation record for a Session. Tmux is the M0 Unix implementation;
//! nothing above this trait names tmux, panes, buffers or transcript files, so
//! a later Agent Host Protocol runtime can replace [`Tmux`] without touching
//! the reconciler, the Session service, the control API, the CLI or persistence.

mod tmux;

pub use tmux::Tmux;

use ::sandbox::SandboxHandle;

use crate::Error;

use super::{AttachTarget, LaunchToken, Session, Turn};

/// Runtime-observed liveness and inactivity for a Session.
///
/// The idle age is calculated against the guest clock so host/microVM skew
/// cannot make an active Session look idle.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Observation {
    /// The Session's process is not present in the runtime.
    Missing,
    /// The Session is present, with attachment and activity age.
    Alive {
        /// Whether a client terminal is attached.
        attached: bool,
        /// Seconds since the last terminal activity or transcript write.
        idle_seconds: u64,
    },
}

/// One harness Session carried inside a Sandbox.
///
/// Every method takes the materialized [`SandboxHandle`]; the runtime holds no
/// Sandbox state of its own, mirroring how tmux is addressed per execution.
pub trait SessionRuntime {
    /// Observes runtime liveness, attachment and inactivity.
    fn observe<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
    ) -> ::sandbox::LocalFuture<'a, Result<Observation, Error>>;

    /// Starts the harness process for `session`.
    ///
    /// `resume` continues that harness-native conversation. `initial_prompt`
    /// is the first operator prompt of a fresh conversation, handed to the
    /// harness at launch so it starts working immediately; it is never
    /// combined with `resume`.
    fn start<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
        session_hook_url: &'a str,
        token: &'a LaunchToken,
        resume: Option<&'a str>,
        initial_prompt: Option<&'a str>,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>>;

    /// Stops a deliberately idle Session.
    fn stop<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>>;

    /// Whether a running harness can accept input before it reports a conversation.
    /// Some harnesses do not create that conversation until the first prompt arrives.
    fn input_ready<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
    ) -> ::sandbox::LocalFuture<'a, Result<bool, Error>>;

    /// Submits `prompt` to the running harness as operator input.
    /// Completes submission before returning; the service serializes delivery
    /// and starts the completion timeout afterwards.
    fn prompt<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
        prompt: &'a str,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>>;

    /// Reads the Session's conversation so far as ordered turns, optionally
    /// limiting work and output to the last `last` complete turns.
    ///
    /// A conversation that has not produced a record yet is empty, not an error.
    fn turns<'a>(
        &'a self,
        session: &'a Session,
        sandbox: &'a SandboxHandle,
        last: Option<usize>,
    ) -> ::sandbox::LocalFuture<'a, Result<Vec<Turn>, Error>>;

    /// Attaches a local terminal to the Session; a client capability distinct
    /// from daemon-owned convergence. It never creates or resumes a Session.
    fn attach<'a>(
        &'a self,
        home: &'a std::path::Path,
        target: &'a AttachTarget,
    ) -> ::sandbox::LocalFuture<'a, Result<(), Error>>;
}
