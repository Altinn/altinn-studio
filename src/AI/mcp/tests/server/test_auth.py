import pytest
from server.auth import get_request_token, get_gitea_token_with_fallback

BEARER_VALUE = "oauth_abc123"
TOKEN_VALUE = "gitea_def456"
FALLBACK_VALUE = "env_ghi789"


class TestGetRequestToken:
    def test_bearer_prefix_case_insensitive(self):
        assert get_request_token({"authorization": f"bearer {BEARER_VALUE}"}) == BEARER_VALUE
        assert get_request_token({"authorization": f"Bearer {BEARER_VALUE}"}) == BEARER_VALUE

    def test_token_prefix_case_insensitive(self):
        assert get_request_token({"authorization": f"token {TOKEN_VALUE}"}) == TOKEN_VALUE
        assert get_request_token({"authorization": f"Token {TOKEN_VALUE}"}) == TOKEN_VALUE

    def test_missing_authorization_header(self):
        assert get_request_token({}) is None

    def test_empty_authorization_header(self):
        assert get_request_token({"authorization": ""}) is None

    def test_invalid_authorization_format(self):
        assert get_request_token({"authorization": "InvalidPrefix token123"}) is None


class TestGetGiteaTokenWithFallback:
    def test_returns_token_from_authorization_header(self):
        assert get_gitea_token_with_fallback({"authorization": f"Bearer {BEARER_VALUE}"}) == BEARER_VALUE
        assert get_gitea_token_with_fallback({"authorization": f"token {TOKEN_VALUE}"}) == TOKEN_VALUE

    def test_fallback_to_environment_variable(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', FALLBACK_VALUE)
        assert get_gitea_token_with_fallback({}) == FALLBACK_VALUE

    def test_header_token_takes_precedence_over_fallback(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', FALLBACK_VALUE)
        assert get_gitea_token_with_fallback({"authorization": f"Bearer {BEARER_VALUE}"}) == BEARER_VALUE

    def test_raises_value_error_when_no_token_available(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', None)
        with pytest.raises(ValueError, match="No Gitea API token found"):
            get_gitea_token_with_fallback({})

    def test_fetches_from_fastmcp_context_when_headers_none(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', FALLBACK_VALUE)
        mock_get_headers = mocker.patch('fastmcp.server.dependencies.get_http_headers')
        mock_get_headers.return_value = {"authorization": f"Bearer {BEARER_VALUE}"}

        assert get_gitea_token_with_fallback(None) == BEARER_VALUE

    def test_uses_fallback_when_context_raises_exception(self, mocker):
        mocker.patch('server.auth.FALLBACK_GITEA_TOKEN', FALLBACK_VALUE)
        mocker.patch('fastmcp.server.dependencies.get_http_headers', side_effect=Exception("Not in HTTP context"))

        assert get_gitea_token_with_fallback(None) == FALLBACK_VALUE
