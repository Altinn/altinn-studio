import pytest
from unittest.mock import Mock
from server.auth import get_request_token, get_gitea_token_with_fallback

BEARER_VALUE = "oauth_abc123"
TOKEN_VALUE = "gitea_def456"
FALLBACK_VALUE = "env_ghi789"

class TestGetRequestToken:
    def test_bearer_prefix_case_insensitive(self):
        headers_lowercase_bearer = {"authorization": f"bearer {BEARER_VALUE}"}
        headers_capitalized_bearer = {"authorization": f"Bearer {BEARER_VALUE}"}

        assert get_request_token(headers_capitalized_bearer) == BEARER_VALUE
        assert get_request_token(headers_lowercase_bearer) == BEARER_VALUE

    def test_token_prefix_case_insensitive(self):
        headers_lowercase_token = {"authorization": f"token {TOKEN_VALUE}"}
        headers_capitalized_token = {"authorization": f"Token {TOKEN_VALUE}"}

        assert get_request_token(headers_lowercase_token) == TOKEN_VALUE
        assert get_request_token(headers_capitalized_token) == TOKEN_VALUE

    def test_header_key_case_insensitive(self):
        headers_lowercase_auth = {"authorization": f"Bearer {BEARER_VALUE}"}
        headers_capitalized_auth = {"Authorization": f"Bearer {BEARER_VALUE}"}

        assert get_request_token(headers_lowercase_auth) == BEARER_VALUE
        assert get_request_token(headers_capitalized_auth) == BEARER_VALUE

    def test_missing_authorization_header(self):
        headers = {}
        result = get_request_token(headers)
        assert result is None

    def test_empty_authorization_header(self):
        headers = {"authorization": ""}
        result = get_request_token(headers)
        assert result is None

    def test_invalid_authorization_format(self):
        headers = {"authorization": "InvalidPrefix token123"}
        result = get_request_token(headers)
        assert result is None

class TestGetGiteaTokenWithFallback:
    def test_returns_token_from_authorization_header(self):
        headers_bearer = {"authorization": f"Bearer {BEARER_VALUE}"}
        headers_token = {"authorization": f"token {TOKEN_VALUE}"}

        assert get_gitea_token_with_fallback(headers_bearer) == BEARER_VALUE
        assert get_gitea_token_with_fallback(headers_token) == TOKEN_VALUE

    def test_fallback_to_environment_variable(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', FALLBACK_VALUE)
        headers = {}
        result = get_gitea_token_with_fallback(headers)
        assert result == FALLBACK_VALUE

    def test_header_token_takes_precedence_over_fallback(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', FALLBACK_VALUE)
        headers = {"authorization": f"Bearer {BEARER_VALUE}"}
        result = get_gitea_token_with_fallback(headers)
        assert result == BEARER_VALUE

    def test_raises_value_error_when_no_token_available(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', None)
        headers = {}
        with pytest.raises(ValueError) as exc_info:
            get_gitea_token_with_fallback(headers)
        assert "No Gitea API token found" in str(exc_info.value)
        assert "Authorization: Bearer <token>" in str(exc_info.value)

    def test_fetches_from_fastmcp_context_when_headers_none(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', FALLBACK_VALUE)
        mock_get_headers = mocker.patch('fastmcp.server.dependencies.get_http_headers')
        mock_get_headers.return_value = {"authorization": f"Bearer {BEARER_VALUE}"}

        result = get_gitea_token_with_fallback(None)
        assert result == BEARER_VALUE

    def test_uses_fallback_when_context_raises_exception(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', FALLBACK_VALUE)
        mock_get_headers = mocker.patch('fastmcp.server.dependencies.get_http_headers')
        mock_get_headers.side_effect = Exception("Not in HTTP context")

        result = get_gitea_token_with_fallback(None)
        assert result == FALLBACK_VALUE
