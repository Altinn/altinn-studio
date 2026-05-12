from unittest.mock import patch
from fastapi.testclient import TestClient
from api.main import app

FEEDBACK_PATH = "/api/feedback"
VALID_TRACE_ID = "trace-abc-123"


class TestFeedbackEndpoint:
    def test_thumbs_up_writes_score_and_returns_204(self):
        with patch("api.routes.feedback.score_validation") as mock_score:
            response = TestClient(app).post(
                FEEDBACK_PATH,
                json={"trace_id": VALID_TRACE_ID, "thumbs_up": True},
            )

        assert response.status_code == 204
        mock_score.assert_called_once_with(
            name="user_feedback",
            passed=True,
            trace_id=VALID_TRACE_ID,
            comment=None,
        )

    def test_thumbs_down_with_comment_is_forwarded(self):
        with patch("api.routes.feedback.score_validation") as mock_score:
            response = TestClient(app).post(
                FEEDBACK_PATH,
                json={
                    "trace_id": VALID_TRACE_ID,
                    "thumbs_up": False,
                    "comment": "Svaret var ikke nyttig.",
                },
            )

        assert response.status_code == 204
        mock_score.assert_called_once_with(
            name="user_feedback",
            passed=False,
            trace_id=VALID_TRACE_ID,
            comment="Svaret var ikke nyttig.",
        )

    def test_empty_trace_id_returns_422(self):
        with patch("api.routes.feedback.score_validation") as mock_score:
            response = TestClient(app).post(
                FEEDBACK_PATH,
                json={"trace_id": "", "thumbs_up": True},
            )

        assert response.status_code == 422
        mock_score.assert_not_called()

    def test_comment_over_max_length_returns_422(self):
        with patch("api.routes.feedback.score_validation") as mock_score:
            response = TestClient(app).post(
                FEEDBACK_PATH,
                json={
                    "trace_id": VALID_TRACE_ID,
                    "thumbs_up": True,
                    "comment": "x" * 10001,
                },
            )

        assert response.status_code == 422
        mock_score.assert_not_called()
