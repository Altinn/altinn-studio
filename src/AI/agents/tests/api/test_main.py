from fastapi.testclient import TestClient
from api.main import app

APP_NAME = "test-app"
APP_ORG = "test-org"
APP_PATH = "/path/to/test-app"


class TestFaviconEndpoint:
    def test_favicon_returns_empty_icon(self):
        response = TestClient(app).get("/favicon.ico")

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/x-icon"
        assert response.content == b""


class TestHealthEndpoint:
    def test_health_check_returns_ok(self):
        response = TestClient(app).get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_health_reports_the_models_this_service_runs(self):
        """A caller recording an end to end score has no other way to learn what
        produced it, and reading its own config instead records the wrong model."""
        from shared.config.base_config import resolved_role_models

        response = TestClient(app).get("/health")

        assert response.json()["models"] == resolved_role_models()
        assert response.json()["models"]["planner"]
