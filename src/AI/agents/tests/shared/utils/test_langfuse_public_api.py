import base64
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from shared.utils.langfuse_public_api import (
    _basic_auth_header,
    create_public_api_client,
)


class TestBasicAuthHeader:
    def test_encodes_public_and_secret_key(self):
        header = _basic_auth_header("pk-123", "sk-abc")
        expected_token = base64.b64encode(b"pk-123:sk-abc").decode()
        assert header == f"Basic {expected_token}"

    def test_raises_when_public_key_missing(self):
        with pytest.raises(RuntimeError, match="credentials are not configured"):
            _basic_auth_header(None, "sk-abc")

    def test_raises_when_secret_key_missing(self):
        with pytest.raises(RuntimeError, match="credentials are not configured"):
            _basic_auth_header("pk-123", None)


class TestCreatePublicApiClient:
    def test_raises_when_credentials_missing(self):
        config = SimpleNamespace(
            LANGFUSE_PUBLIC_KEY=None,
            LANGFUSE_SECRET_KEY=None,
            LANGFUSE_HOST="https://langfuse.test",
        )
        with patch(
            "shared.utils.langfuse_public_api.get_config", return_value=config
        ):
            with pytest.raises(RuntimeError, match="credentials are not configured"):
                create_public_api_client()
