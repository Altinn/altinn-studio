"""Tests for metrics.langfuse_client helpers."""

import base64

import pytest

from metrics.langfuse_client import _create_auth_header


class TestBasicAuthHeader:
    def test_encodes_public_and_secret_key(self):
        header = _create_auth_header("pk-123", "sk-abc")
        expected_token = base64.b64encode(b"pk-123:sk-abc").decode()
        assert header == f"Basic {expected_token}"

    def test_raises_when_public_key_missing(self):
        with pytest.raises(RuntimeError, match="credentials are not configured"):
            _create_auth_header(None, "sk-abc")

    def test_raises_when_secret_key_missing(self):
        with pytest.raises(RuntimeError, match="credentials are not configured"):
            _create_auth_header("pk-123", None)
