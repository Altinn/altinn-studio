//! Session specialization of the generic keyed reconciliation controller.

use std::{rc::Rc, time::Duration};

use crate::{Error, controller};

use super::{SessionId, SharedStore};

/// Observes recoverable Session reconciliation errors without stopping the controller.
pub type ErrorHandler = controller::ErrorHandler<SessionId>;

/// A handle for requesting immediate Session convergence.
pub type Wakeup = controller::Wakeup<SessionId>;

struct Source(SharedStore);

impl controller::Source<SessionId> for Source {
    fn list_keys(&self) -> ::sandbox::LocalFuture<'_, Result<Vec<SessionId>, Error>> {
        Box::pin(async move {
            self.0
                .list_all_sessions()
                .await
                .map(|sessions| sessions.into_iter().map(|session| session.id).collect())
        })
    }
}

/// Generic keyed reconciliation specialized for durable Sessions.
pub struct Controller(controller::Controller<SessionId>);

/// Wakes Sessions affected by an Agent readiness or Sandbox transition.
pub struct AgentNotifier {
    store: SharedStore,
    wakeup: Wakeup,
    on_error: Rc<dyn Fn(&Error)>,
}

impl AgentNotifier {
    /// Creates a notifier over durable Sessions and their controller.
    #[must_use]
    pub fn new(store: SharedStore, wakeup: Wakeup, on_error: Rc<dyn Fn(&Error)>) -> Self {
        Self {
            store,
            wakeup,
            on_error,
        }
    }
}

impl crate::control_plane::SessionNotifier for AgentNotifier {
    fn notify(&self, id: crate::AgentId) {
        let store = self.store.clone();
        let wakeup = self.wakeup.clone();
        let on_error = self.on_error.clone();
        tokio::task::spawn_local(async move {
            match store.list_all_sessions().await {
                Ok(sessions) => {
                    for session in sessions.into_iter().filter(|session| session.agent_id == id) {
                        wakeup.notify(session.id);
                    }
                }
                Err(error) => on_error(&error),
            }
        });
    }
}

impl Controller {
    /// Creates a Session controller and its independently shareable wake-up handle.
    #[must_use]
    pub fn new(
        store: SharedStore,
        reconciler: Rc<dyn controller::Reconcile<SessionId>>,
        interval: Duration,
        on_error: ErrorHandler,
    ) -> (Self, Wakeup) {
        let (controller, wakeup) =
            controller::Controller::new(Rc::new(Source(store)), reconciler, interval, "Session", on_error);
        (Self(controller), wakeup)
    }

    /// Reconciles existing Sessions immediately and then continuously.
    pub async fn run(self) {
        self.0.run().await;
    }
}
