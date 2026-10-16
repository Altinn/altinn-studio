use std::{cell::Cell, rc::Rc};

use hyper::{Method, Request, Response, StatusCode, body::Incoming};

use crate::{
    http::{Body, empty, problem},
    slot::Slot,
    vm::Vms,
};

/// The HTTP API of the runner.
#[expect(dead_code, reason = "the job routes use the VMs and the slot")]
pub struct Routes {
    vms: Vms,
    slot: Slot,
    stopping: Rc<Cell<bool>>,
}

impl Routes {
    #[must_use]
    pub const fn new(vms: Vms, slot: Slot, stopping: Rc<Cell<bool>>) -> Self {
        Self { vms, slot, stopping }
    }

    #[expect(clippy::unused_async, reason = "the job routes wait for the VM")]
    pub async fn handle(&self, request: Request<Incoming>) -> Response<Body> {
        match (request.method(), request.uri().path()) {
            (&Method::GET, "/health") => self.health(),
            _ => problem(StatusCode::NOT_FOUND, "No such route."),
        }
    }

    /// A stopping pod is not ready, so that Kubernetes sends new requests to another pod.
    fn health(&self) -> Response<Body> {
        empty(if self.stopping.get() {
            StatusCode::SERVICE_UNAVAILABLE
        } else {
            StatusCode::OK
        })
    }
}
