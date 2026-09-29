"""run_in_background ends every run by removing the session's clone."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from agents.graph.runner import WorkflowCancelled, run_in_background
from agents.graph.state import AgentState
from agents.services.events.jobs import EventSink

SESSION_ID = "sess-1"


def _state() -> AgentState:
    return AgentState(
        session_id=SESSION_ID,
        user_goal="Legg til et felt",
        repo_path="/tmp/repo",
        app_name="test-app",
        developer="dev",
        org="ttd",
    )


async def _run_and_get_repo_manager(run_once: AsyncMock) -> Mock:
    repo_manager = Mock()
    with (
        patch("agents.graph.runner.run_once", run_once),
        patch("agents.graph.runner.get_repo_manager", return_value=repo_manager),
        patch("agents.graph.runner.flush_langfuse"),
    ):
        await run_in_background(_state(), EventSink())
    return repo_manager


@pytest.mark.parametrize(
    "run_outcome",
    [
        pytest.param(None, id="completes"),
        pytest.param(RuntimeError("model unavailable"), id="fails"),
        pytest.param(WorkflowCancelled("cancelled"), id="is cancelled"),
    ],
)
async def test_removes_the_session_clone_when_the_run(run_outcome):
    repo_manager = await _run_and_get_repo_manager(AsyncMock(side_effect=run_outcome))

    repo_manager.cleanup_session.assert_called_once_with(SESSION_ID)
