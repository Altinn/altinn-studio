import base64

import pytest

from shared.utils.langfuse_public_api import _basic_auth_header


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
