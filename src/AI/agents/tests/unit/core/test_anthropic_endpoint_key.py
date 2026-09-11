"""A separate Azure resource for Anthropic needs its own key, or every call 401s."""

from __future__ import annotations

import pytest

from shared.config import base_config


class _Config:
    AZURE_ANTHROPIC_ENDPOINT = "https://other-resource.services.ai.azure.com/anthropic/"
    AZURE_API_KEY = "openai-resource-key"
    AZURE_ANTHROPIC_API_KEY = "anthropic-resource-key"
    ANTHROPIC_API_KEY = None


@pytest.fixture
def config(monkeypatch):
    fake = _Config()
    monkeypatch.setattr(base_config, "get_config", lambda: fake)
    from agents.core import llm_adapter

    monkeypatch.setattr(llm_adapter, "get_config", lambda: fake)
    return fake


def _client_for(config):
    from agents.core.llm_adapter import AnthropicAdapter

    return AnthropicAdapter(model="claude-sonnet-5")._client


class TestTheConfigResolvesTheKey:
    """Both client tests set the resolved value on a fake, so the resolution itself,
    which is what a single-resource deployment relies on, was never exercised."""

    def _fresh(self):
        """A private copy: reloading the shared module changes it for every later test."""
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "_base_config_probe", base_config.__file__
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module.BaseConfig

    def test_the_anthropic_key_falls_back_to_the_azure_key(self, monkeypatch):
        monkeypatch.delenv("AZURE_ANTHROPIC_API_KEY", raising=False)
        monkeypatch.setenv("AZURE_API_KEY", "one-resource-key")

        assert self._fresh().AZURE_ANTHROPIC_API_KEY == "one-resource-key"

    def test_a_dedicated_key_wins_over_the_azure_key(self, monkeypatch):
        monkeypatch.setenv("AZURE_ANTHROPIC_API_KEY", "dedicated")
        monkeypatch.setenv("AZURE_API_KEY", "one-resource-key")

        assert self._fresh().AZURE_ANTHROPIC_API_KEY == "dedicated"


class TestTheKeyMatchesTheEndpoint:
    def test_the_anthropic_key_is_used_when_set(self, config):
        assert _client_for(config).api_key == "anthropic-resource-key"

    def test_it_falls_back_to_the_azure_key_on_a_single_resource(self, config):
        """A setup where both endpoints are one resource needs no new variable."""
        config.AZURE_ANTHROPIC_API_KEY = config.AZURE_API_KEY

        assert _client_for(config).api_key == "openai-resource-key"

    def test_the_endpoint_is_the_anthropic_one(self, config):
        assert "anthropic" in str(_client_for(config).base_url)

    def test_a_missing_key_says_which_variable_to_set(self, config):
        config.AZURE_ANTHROPIC_API_KEY = None
        config.ANTHROPIC_API_KEY = None

        with pytest.raises(ValueError, match="AZURE_ANTHROPIC_API_KEY"):
            _client_for(config)


class TestBothAnthropicClientsUseTheSameKey:
    """Two places build an Anthropic client, and fixing one left the planner 401ing."""

    def test_the_llm_client_uses_the_anthropic_key(self, config, monkeypatch):
        from agents.services.llm import llm_client

        monkeypatch.setattr(llm_client, "config", config)
        client = llm_client.LLMClient.__new__(llm_client.LLMClient)
        client._init_anthropic_client("planner", "claude-opus-4-8", None)

        assert client.anthropic_client.api_key == "anthropic-resource-key"

    def test_it_falls_back_to_the_azure_key(self, config, monkeypatch):
        from agents.services.llm import llm_client

        config.AZURE_ANTHROPIC_API_KEY = config.AZURE_API_KEY
        monkeypatch.setattr(llm_client, "config", config)
        client = llm_client.LLMClient.__new__(llm_client.LLMClient)
        client._init_anthropic_client("planner", "claude-opus-4-8", None)

        assert client.anthropic_client.api_key == "openai-resource-key"

    def test_a_missing_key_names_the_variable(self, config, monkeypatch):
        from agents.services.llm import llm_client

        config.AZURE_ANTHROPIC_API_KEY = None
        config.ANTHROPIC_API_KEY = None
        monkeypatch.setattr(llm_client, "config", config)
        client = llm_client.LLMClient.__new__(llm_client.LLMClient)

        with pytest.raises(ValueError, match="AZURE_ANTHROPIC_API_KEY"):
            client._init_anthropic_client("planner", "claude-opus-4-8", None)

    def test_no_anthropic_client_still_reads_the_openai_key_directly(self):
        """A grep guard: if a third site appears, it must use the anthropic key."""
        import pathlib
        import re

        for name in (
            "agents/core/llm_adapter.py",
            "agents/services/llm/llm_client.py",
        ):
            source = pathlib.Path(name).read_text(encoding="utf-8")
            for match in re.finditer(r"Anthropic\((.*?)\)", source, re.S):
                assert "AZURE_API_KEY" not in match.group(1), name
