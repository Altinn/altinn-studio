from unittest.mock import patch

from fastapi.testclient import TestClient

from api.main import app

FEEDBACK_PATH = "/api/feedback"
VALID_TRACE_ID = "trace-abc-123"
DEVELOPER = "ola"
OTHER_DEVELOPER = "kari"
DEVELOPER_HEADER = {"X-Developer": DEVELOPER}


def _post_feedback(payload, headers=None):
    return TestClient(app).post(FEEDBACK_PATH, json=payload, headers=headers)


class TestFeedbackEndpoint:
    def test_thumbs_up_writes_score_and_returns_204(self):
        with (
            patch("api.routes.feedback.get_trace_developer", return_value=DEVELOPER),
            patch("api.routes.feedback.score_validation") as mock_score,
        ):
            response = _post_feedback(
                {"trace_id": VALID_TRACE_ID, "thumbs_up": True},
                headers=DEVELOPER_HEADER,
            )

        assert response.status_code == 204
        mock_score.assert_called_once_with(
            name="user_feedback",
            passed=True,
            trace_id=VALID_TRACE_ID,
            comment=None,
        )

    def test_thumbs_down_with_comment_is_forwarded(self):
        with (
            patch("api.routes.feedback.get_trace_developer", return_value=DEVELOPER),
            patch("api.routes.feedback.score_validation") as mock_score,
        ):
            response = _post_feedback(
                {
                    "trace_id": VALID_TRACE_ID,
                    "thumbs_up": False,
                    "comment": "Svaret var ikke nyttig.",
                },
                headers=DEVELOPER_HEADER,
            )

        assert response.status_code == 204
        mock_score.assert_called_once_with(
            name="user_feedback",
            passed=False,
            trace_id=VALID_TRACE_ID,
            comment="Svaret var ikke nyttig.",
        )

    def test_missing_developer_header_returns_400(self):
        with patch("api.routes.feedback.score_validation") as mock_score:
            response = _post_feedback({"trace_id": VALID_TRACE_ID, "thumbs_up": True})

        assert response.status_code == 400
        mock_score.assert_not_called()

    def test_unknown_trace_owner_returns_403(self):
        with (
            patch("api.routes.feedback.get_trace_developer", return_value=None),
            patch("api.routes.feedback.score_validation") as mock_score,
        ):
            response = _post_feedback(
                {"trace_id": VALID_TRACE_ID, "thumbs_up": True},
                headers=DEVELOPER_HEADER,
            )

        assert response.status_code == 403
        mock_score.assert_not_called()

    def test_owner_mismatch_returns_403(self):
        with (
            patch(
                "api.routes.feedback.get_trace_developer", return_value=OTHER_DEVELOPER
            ),
            patch("api.routes.feedback.score_validation") as mock_score,
        ):
            response = _post_feedback(
                {"trace_id": VALID_TRACE_ID, "thumbs_up": True},
                headers=DEVELOPER_HEADER,
            )

        assert response.status_code == 403
        mock_score.assert_not_called()

    def test_empty_trace_id_returns_422(self):
        with patch("api.routes.feedback.score_validation") as mock_score:
            response = _post_feedback(
                {"trace_id": "", "thumbs_up": True},
                headers=DEVELOPER_HEADER,
            )

        assert response.status_code == 422
        mock_score.assert_not_called()

    def test_comment_over_max_length_returns_422(self):
        with patch("api.routes.feedback.score_validation") as mock_score:
            response = _post_feedback(
                {
                    "trace_id": VALID_TRACE_ID,
                    "thumbs_up": True,
                    "comment": "x" * 10001,
                },
                headers=DEVELOPER_HEADER,
            )

        assert response.status_code == 422
        mock_score.assert_not_called()
