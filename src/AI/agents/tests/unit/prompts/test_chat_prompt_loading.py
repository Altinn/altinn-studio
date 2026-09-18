"""Only a chat prompt is experiment-testable, with the system half held fixed."""

from __future__ import annotations

import pytest

from agents.prompts import loader
from agents.prompts.loader import _system_message, get_prompt_with_langfuse

SYSTEM = "You are the safety gate."


class _Prompt:
    def __init__(self, compiled):
        self._compiled = compiled

    def compile(self, **_):
        return self._compiled


class TestSystemMessageExtraction:
    def test_a_text_prompt_is_its_own_content(self):
        assert _system_message(SYSTEM) == SYSTEM

    def test_a_chat_prompt_yields_its_system_message(self):
        compiled = [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": "{{user_message}}"},
        ]

        assert _system_message(compiled) == SYSTEM

    def test_the_user_message_is_not_returned(self):
        """Production builds its own user message; taking the template's would send
        a literal '{{user_message}}' to the model."""
        compiled = [{"role": "user", "content": "{{user_message}}"}]

        assert _system_message(compiled) is None

    def test_an_empty_prompt_is_none(self):
        assert _system_message("") is None
        assert _system_message([]) is None

    @pytest.mark.parametrize("compiled", [None, 42, {"role": "system"}])
    def test_an_unexpected_shape_is_none(self, compiled):
        assert _system_message(compiled) is None


class TestFallbackToTheLocalFile:
    def test_a_chat_prompt_is_used_when_it_has_a_system_message(self, monkeypatch):
        prompt = _Prompt([{"role": "system", "content": SYSTEM}])
        monkeypatch.setattr(loader, "get_raw_langfuse_prompt", lambda name, **k: prompt)

        content, raw = get_prompt_with_langfuse("intent_security")

        assert content == SYSTEM
        assert raw is prompt

    def test_a_prompt_with_no_system_message_falls_back(self, monkeypatch):
        """Sending an empty system prompt would be worse than ignoring Langfuse, so
        the local file wins and the raw prompt is dropped."""
        monkeypatch.setattr(
            loader,
            "get_raw_langfuse_prompt",
            lambda name, **k: _Prompt([{"role": "user", "content": "x"}]),
        )

        content, raw = get_prompt_with_langfuse("intent_security")

        assert "safety gate for Altinity" in content
        assert raw is None

    def test_a_compile_failure_falls_back(self, monkeypatch):
        class Broken:
            def compile(self, **_):
                raise RuntimeError("boom")

        monkeypatch.setattr(loader, "get_raw_langfuse_prompt", lambda name, **k: Broken())

        content, raw = get_prompt_with_langfuse("scope_check")

        assert "scope classifier" in content
        assert raw is None


class TestTheGatesFetchTheChatPrompts:
    """Langfuse forbids changing a prompt's type, so the gate moved to a new name."""

    def test_the_safety_gate_falls_back_to_the_file_it_still_has(self, monkeypatch):
        monkeypatch.setattr(loader, "get_raw_langfuse_prompt", lambda name, **k: None)

        content, _ = get_prompt_with_langfuse("intent_check", local_path="intent_security")

        assert "safety gate for Altinity" in content

    def test_the_new_name_has_no_local_file_of_its_own(self):
        """If someone adds intent_check.md the two would drift silently."""
        assert not (loader.PROMPTS_DIR / "intent_check.md").exists()

    def test_a_missing_local_file_is_an_error_not_an_empty_prompt(self, monkeypatch):
        monkeypatch.setattr(loader, "get_raw_langfuse_prompt", lambda name, **k: None)

        with pytest.raises(FileNotFoundError):
            get_prompt_with_langfuse("intent_check")
