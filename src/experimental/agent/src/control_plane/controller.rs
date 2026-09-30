//! Agent specialization of the generic keyed reconciliation controller.

use std::{rc::Rc, time::Duration};

use crate::{Error, control_plane::AgentId, controller};

use super::SharedAgentStore;

/// Observes recoverable Agent reconciliation errors without stopping the controller.
pub type ErrorHandler = controller::ErrorHandler<AgentId>;

/// A handle for requesting immediate Agent convergence.
pub type Wakeup = controller::Wakeup<AgentId>;

struct Source(SharedAgentStore);

impl controller::Source<AgentId> for Source {
    fn list_keys(&self) -> ::sandbox::LocalFuture<'_, Result<Vec<AgentId>, Error>> {
        Box::pin(async move {
            self.0
                .list()
                .await
                .map(|records| records.into_iter().map(|record| record.id).collect())
        })
    }
}

/// Generic keyed reconciliation specialized for durable Agents.
pub struct Controller(controller::Controller<AgentId>);

impl Controller {
    /// Creates an Agent controller and its independently shareable wake-up handle.
    #[must_use]
    pub fn new(
        store: SharedAgentStore,
        reconciler: Rc<dyn controller::Reconcile<AgentId>>,
        interval: Duration,
        on_error: ErrorHandler,
    ) -> (Self, Wakeup) {
        let (controller, wakeup) =
            controller::Controller::new(Rc::new(Source(store)), reconciler, interval, "Agent", on_error);
        (Self(controller), wakeup)
    }

    /// Reconciles existing Agents immediately and then continuously.
    pub async fn run(self) {
        self.0.run().await;
    }
}
