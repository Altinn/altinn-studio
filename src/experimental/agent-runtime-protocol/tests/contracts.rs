use agent_runtime_protocol::{
    CreateRunRequest, HarnessInstallationId, Prompt, Run, RunId, RunState, Session, SessionId, SessionState,
};

#[test]
fn session_lifecycle_and_run_state_are_independent() {
    let session = Session {
        id: SessionId::new("session-1"),
        harness_installation: HarnessInstallationId::new("codex-1"),
        state: SessionState::Ready,
    };
    let request = CreateRunRequest {
        session_id: session.id.clone(),
        prompt: Prompt { text: "work".into() },
    };
    let run = Run {
        id: RunId::new("run-1"),
        session_id: request.session_id,
        prompt: request.prompt,
        state: RunState::Running,
    };

    assert_eq!(session.state, SessionState::Ready);
    assert_eq!(run.state, RunState::Running);
}
