"""Which model each role resolves to."""

from __future__ import annotations

import pytest

from shared.config import base_config
from shared.config.base_config import DEFAULT_ROLE, default_role_model, resolved_role_models


class _Config:
    LLM_MODEL_ACTOR = "actor-model"
    LLM_MODEL_PLANNER = "planner-model"
    LLM_MODEL_TOOL_PLANNER = "tool-planner-model"
    LLM_MODEL_REVIEWER = "reviewer-model"
    LLM_MODEL_ASSISTANT = "assistant-model"
    LLM_MODEL = "llm-model"
    AZURE_DEPLOYMENT_NAME = "azure-deployment"
    AZURE_API_KEY = "a-key"


@pytest.fixture
def config(monkeypatch):
    fake = _Config()
    monkeypatch.setattr(base_config, "get_config", lambda: fake)
    return fake


class TestTheDefaultRole:
    """The default role is what `get_llm_client()` with no role returns, which is
    what serves the scope gate and the intent parser."""

    def test_an_azure_key_means_the_azure_deployment(self, config):
        """The .env.example marks AZURE_API_KEY required, so this is the real path.
        Reading LLM_MODEL instead reports a model the gates never call."""
        assert default_role_model() == "azure-deployment"

    def test_without_an_azure_key_it_falls_back_to_llm_model(self, config):
        config.AZURE_API_KEY = None

        assert default_role_model() == "llm-model"

    def test_it_is_reported_under_its_own_name(self, config):
        assert resolved_role_models()[DEFAULT_ROLE] == "azure-deployment"


class TestTheTwoResolutionPaths:
    """Model selection is implemented twice, and the copies disagree. Recorded
    here rather than left to be rediscovered from a wrong number in a report."""

    def test_the_default_role_follows_the_client_that_serves_it(self, config):
        """LLMClient gates on the key; build_adapter uses `or`. With no key the
        two answer differently, and the gates go through LLMClient."""
        config.AZURE_API_KEY = None

        assert default_role_model() == "llm-model"
        assert (config.AZURE_DEPLOYMENT_NAME or config.LLM_MODEL) == "azure-deployment"

    def test_they_agree_whenever_an_azure_key_is_configured(self, config):
        assert default_role_model() == (config.AZURE_DEPLOYMENT_NAME or config.LLM_MODEL)

    def test_the_named_roles_are_read_from_one_place(self, config):
        """Both paths read LLM_MODEL_<ROLE> for the named roles, so those cannot
        drift the way the default did."""
        models = resolved_role_models()

        assert models["actor"] == config.LLM_MODEL_ACTOR
        assert models["planner"] == config.LLM_MODEL_PLANNER
        assert models["reviewer"] == config.LLM_MODEL_REVIEWER

    def test_tool_planner_exists_in_only_one_of_the_two(self, config):
        """LLMClient branches on it; build_adapter has no branch and would answer
        with the default deployment."""
        assert resolved_role_models()["tool_planner"] == config.LLM_MODEL_TOOL_PLANNER

    def test_it_is_reported_under_its_own_name(self, config):
        assert resolved_role_models()[DEFAULT_ROLE] == "azure-deployment"


class TestTheNamedRoles:
    def test_each_role_reports_its_own_key(self, config):
        models = resolved_role_models()

        assert models["actor"] == "actor-model"
        assert models["reviewer"] == "reviewer-model"
        assert models["assistant"] == "assistant-model"

    def test_llm_model_is_not_reported_as_a_role_of_its_own(self, config):
        """It was reported as 'fallback', which read like a role the client has.
        It is only ever reached when there is no Azure key."""
        assert "fallback" not in resolved_role_models()
