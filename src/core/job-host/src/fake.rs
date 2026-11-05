//! A fake [`Runner`] for the tests of the host and the routes.

use std::cell::{Cell, RefCell};

use bytes::Bytes;
use sandbox_authorization::LocalFuture;
use sandbox_host::AnyError;
use tokio::sync::Notify;

use crate::run::{Outcome, Run, RunError, Runner};

pub(crate) const RUN_ID: &str = "0b6f3c1e-8d2a-4f5b-9c7e-1a2b3c4d5e6f";

/// Runs no VM. A test can hold the command until it releases it, and can make the run fail.
#[derive(Default)]
pub(crate) struct FakeRunner {
    pub(crate) error: RefCell<Option<RunError>>,
    pub(crate) hold: Cell<bool>,
    pub(crate) started: Notify,
    pub(crate) release: Notify,
    pub(crate) archives: RefCell<Vec<Bytes>>,
    pub(crate) deletes: Cell<usize>,
}

impl Runner for FakeRunner {
    fn run(&self, run: Run) -> LocalFuture<'_, Result<Outcome, RunError>> {
        Box::pin(async move {
            self.archives.borrow_mut().push(run.archive);
            self.started.notify_one();
            if self.hold.get() {
                self.release.notified().await;
            }
            if let Some(error) = self.error.borrow_mut().take() {
                return Err(error);
            }
            Ok(Outcome {
                exit_code: Some(0),
                timed_out: false,
                stdout: String::new(),
                stderr: String::new(),
                report: serde_json::json!({ "exitCode": 0 }).as_object().cloned(),
                patch: Some("ZGlmZgo=".to_string()),
            })
        })
    }

    fn delete_vm(&self) -> LocalFuture<'_, Result<(), AnyError>> {
        self.deletes.set(self.deletes.get() + 1);
        Box::pin(async { Ok(()) })
    }
}
