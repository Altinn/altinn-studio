//! Session store decorator that announces durable changes.
//!
//! Every writer (the reconciler, the harness reports, the user path) goes through
//! the same store, so publishing after each successful write is the one place
//! that knows a Session changed. Waiters subscribe to a per-Session change
//! tick and re-read durable state when it fires; there is no second copy of
//! the state to keep consistent and no poll to cover a gap.

use std::{cell::RefCell, collections::HashMap, rc::Rc};

use ::sandbox::LocalFuture;
use time::OffsetDateTime;
use tokio::sync::watch;

use crate::{Error, Harness};

use super::{
    Activity, ActivityEvent, AttachTarget, LaunchRecord, LaunchState, LaunchToken, Lifecycle, Session, SessionId,
    SessionName, SessionReports, SessionStore,
};

/// Per-Session change ticks. Channels are created on subscription and dropped
/// once their last subscriber is gone, so an idle daemon holds no state here.
#[derive(Clone, Default)]
pub struct SessionObservers {
    channels: Rc<RefCell<HashMap<SessionId, watch::Sender<u64>>>>,
}

impl SessionObservers {
    /// Creates empty observers.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Subscribes to changes of `id`. The receiver wakes on every durable
    /// write to the Session after this call; the subscriber re-reads the store.
    #[must_use]
    pub fn subscribe(&self, id: SessionId) -> watch::Receiver<u64> {
        let mut channels = self.channels.borrow_mut();
        channels.entry(id).or_insert_with(|| watch::Sender::new(0)).subscribe()
    }

    /// Announces a durable change to `id`'s subscribers, if any.
    pub fn publish(&self, id: SessionId) {
        let mut channels = self.channels.borrow_mut();
        let Some(sender) = channels.get(&id) else {
            return;
        };
        if sender.receiver_count() == 0 {
            channels.remove(&id);
            return;
        }
        sender.send_modify(|version| *version += 1);
    }
}

/// A [`SessionStore`] and [`SessionReports`] that publishes to
/// [`SessionObservers`] after each successful write that changes what a
/// Session reader sees.
pub struct ObservedStore<S> {
    inner: Rc<S>,
    observers: SessionObservers,
}

impl<S> ObservedStore<S> {
    /// Wraps `inner`, publishing its writes to `observers`.
    #[must_use]
    pub const fn new(inner: Rc<S>, observers: SessionObservers) -> Self {
        Self { inner, observers }
    }
}

impl<S: SessionReports> SessionReports for ObservedStore<S> {
    fn record_session_start_for_launch<'a>(
        &'a self,
        id: SessionId,
        token: &'a LaunchToken,
        native: &'a str,
        transcript_path: Option<&'a str>,
    ) -> LocalFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            self.inner
                .record_session_start_for_launch(id, token, native, transcript_path)
                .await?;
            self.observers.publish(id);
            Ok(())
        })
    }

    fn apply_session_activity_for_launch<'a>(
        &'a self,
        id: SessionId,
        token: &'a LaunchToken,
        event: ActivityEvent,
        at: OffsetDateTime,
    ) -> LocalFuture<'a, Result<Option<Activity>, Error>> {
        Box::pin(async move {
            let applied = self
                .inner
                .apply_session_activity_for_launch(id, token, event, at)
                .await?;
            if applied.is_some() {
                self.observers.publish(id);
            }
            Ok(applied)
        })
    }
}

impl<S: SessionStore> SessionStore for ObservedStore<S> {
    fn ensure_session<'a>(
        &'a self,
        agent: &'a str,
        name: &'a SessionName,
        harness: Harness,
        initial_prompt: Option<&'a str>,
    ) -> LocalFuture<'a, Result<Session, Error>> {
        self.inner.ensure_session(agent, name, harness, initial_prompt)
    }

    fn session_initial_prompt(&self, id: SessionId) -> LocalFuture<'_, Result<Option<String>, Error>> {
        self.inner.session_initial_prompt(id)
    }

    fn clear_session_initial_prompt(&self, id: SessionId) -> LocalFuture<'_, Result<(), Error>> {
        self.inner.clear_session_initial_prompt(id)
    }

    fn get_session(&self, id: SessionId) -> LocalFuture<'_, Result<Session, Error>> {
        self.inner.get_session(id)
    }

    fn get_agent_session<'a>(
        &'a self,
        agent: &'a str,
        name: &'a SessionName,
    ) -> LocalFuture<'a, Result<Session, Error>> {
        self.inner.get_agent_session(agent, name)
    }

    fn list_all_sessions(&self) -> LocalFuture<'_, Result<Vec<Session>, Error>> {
        self.inner.list_all_sessions()
    }

    fn list_agent_sessions<'a>(&'a self, agent: &'a str) -> LocalFuture<'a, Result<Vec<Session>, Error>> {
        self.inner.list_agent_sessions(agent)
    }

    fn update_session_lifecycle(
        &self,
        id: SessionId,
        lifecycle: Lifecycle,
        observed_activation_generation: u64,
    ) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.inner
                .update_session_lifecycle(id, lifecycle, observed_activation_generation)
                .await?;
            self.observers.publish(id);
            Ok(())
        })
    }

    fn activate_session(&self, id: SessionId) -> LocalFuture<'_, Result<u64, Error>> {
        self.inner.activate_session(id)
    }

    fn session_attach_target(&self, id: SessionId) -> LocalFuture<'_, Result<AttachTarget, Error>> {
        self.inner.session_attach_target(id)
    }

    fn clear_session_report(&self, id: SessionId) -> LocalFuture<'_, Result<(), Error>> {
        Box::pin(async move {
            self.inner.clear_session_report(id).await?;
            self.observers.publish(id);
            Ok(())
        })
    }

    fn record_session_launch(&self, id: SessionId, launch: LaunchRecord) -> LocalFuture<'_, Result<(), Error>> {
        self.inner.record_session_launch(id, launch)
    }

    fn session_launch_state(&self, id: SessionId) -> LocalFuture<'_, Result<Option<LaunchState>, Error>> {
        self.inner.session_launch_state(id)
    }

    fn reset_session_launch_attempts(&self, id: SessionId) -> LocalFuture<'_, Result<(), Error>> {
        self.inner.reset_session_launch_attempts(id)
    }
}

#[cfg(test)]
mod tests {
    use super::SessionObservers;

    #[test]
    fn observers_publish_only_while_subscribed() {
        let observers = SessionObservers::new();
        let id = super::SessionId::generate();
        observers.publish(id);
        assert!(
            observers.channels.borrow().is_empty(),
            "no channel without a subscriber"
        );

        let mut receiver = observers.subscribe(id);
        assert!(!receiver.has_changed().expect("channel open"));
        observers.publish(id);
        assert!(receiver.has_changed().expect("channel open"));
        assert_eq!(*receiver.borrow_and_update(), 1);

        drop(receiver);
        observers.publish(id);
        assert!(
            observers.channels.borrow().is_empty(),
            "last unsubscribe drops the channel"
        );
    }
}
