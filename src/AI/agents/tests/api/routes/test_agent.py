import contextlib
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import Response

from api.main import app
from api.routes.agent import (
    ALL_DEVELOPERS_LIMIT,
    PER_DEVELOPER_LIMIT,
    rate_limit_start_all_developers,
    rate_limit_start_developer,
)

START_PATH = "/api/agent/start"


def _headers(developer: str) -> dict[str, str]:
    return {"X-Developer": developer, "X-Api-Key": "test-key"}


def _start_payload() -> dict:
    return {
        "session_id": "session-1",
        "goal": "Add a field to the form",
        "repo_url": "https://dev.altinn.studio/repos/ttd/my-app.git",
        "org": "ttd",
    }


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    """Limiters are module-level singletons, so their counts leak between tests."""
    rate_limit_start_developer._hits_per_group.clear()
    rate_limit_start_all_developers._hits_per_group.clear()
    yield


@contextlib.contextmanager
def _stubbed_agent_start(repo_path):
    """Stub the side effects of a successful start so the body returns 200 without cloning."""
    repo_manager = Mock()
    repo_manager.clone_repo_for_session.return_value = str(repo_path)
    sink_stub = Mock()
    sink_stub.get_conversation_history.return_value = []
    with (
        patch("api.routes.agent.get_repo_manager", return_value=repo_manager),
        patch("api.routes.agent.run_in_background"),
        patch("api.routes.agent.sink", sink_stub),
    ):
        yield


def _post_start(client: TestClient, developer: str) -> Response:
    return client.post(START_PATH, json=_start_payload(), headers=_headers(developer))


def _exhaust_developer(client: TestClient, developer: str) -> None:
    for _ in range(PER_DEVELOPER_LIMIT):
        assert _post_start(client, developer).status_code == 200


class TestStartAgentRateLimiting:
    def test_allows_requests_up_to_the_per_developer_limit(self, tmp_path):
        with _stubbed_agent_start(tmp_path):
            client = TestClient(app)
            _exhaust_developer(client, "kari")

    def test_rejects_the_request_that_exceeds_the_per_developer_limit(self, tmp_path):
        with _stubbed_agent_start(tmp_path):
            client = TestClient(app)
            _exhaust_developer(client, "kari")
            response = _post_start(client, "kari")

        assert response.status_code == 429
        assert "Retry-After" in response.headers

    def test_developers_are_limited_independently(self, tmp_path):
        with _stubbed_agent_start(tmp_path):
            client = TestClient(app)
            _exhaust_developer(client, "kari")
            response = _post_start(client, "ola")

        assert response.status_code == 200

    def test_rejects_a_missing_developer_header_with_400(self, tmp_path):
        with _stubbed_agent_start(tmp_path):
            response = TestClient(app).post(
                START_PATH, json=_start_payload(), headers={"X-Api-Key": "test-key"}
            )

        assert response.status_code == 400

    def test_rejects_when_the_all_developers_limit_is_exceeded(self, tmp_path):
        developers_needed_to_fill_global_budget = ALL_DEVELOPERS_LIMIT // PER_DEVELOPER_LIMIT
        with _stubbed_agent_start(tmp_path):
            client = TestClient(app)
            for index in range(developers_needed_to_fill_global_budget):
                _exhaust_developer(client, f"dev-{index}")
            response = _post_start(client, "a-fresh-developer")

        assert response.status_code == 429


class TestPermissionGateDefaults:
    """The write-permission flag must fail closed everywhere it has a default."""

    def test_start_request_defaults_to_read_only(self):
        from api.routes.agent import StartReq

        request = StartReq(
            session_id="sess-1",
            goal="add a field",
            repo_url="http://gitea/repo.git",
            org="ttd",
        )

        assert request.allow_app_changes is False

    def test_agent_state_defaults_to_read_only(self):
        from agents.graph.state import AgentState

        state = AgentState(
            session_id="sess-1",
            user_goal="add a field",
            repo_path="/tmp/repo",
            app_name="test-app",
            developer="dev",
            org="ttd",
        )

        assert state.allow_app_changes is False
