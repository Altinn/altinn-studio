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
        assert response.json() == {"status": "ok"}
