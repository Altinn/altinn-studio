"""The SECURITY_NOTICE line is lifted out of the summary into its own field."""

from __future__ import annotations

import json
from types import SimpleNamespace

from agents.core.loop import LoopResult, TerminationReason
from agents.graph.nodes.agentic_loop_node import (
    MAX_SECURITY_NOTICE_LENGTH,
    SECURITY_NOTICE_HISTORY_MARKER,
    _emit_workflow_completion,
    _extract_security_notice,
)

_SUMMARY = "Skjemaet er gjenskapt og commitet som `855b1641`."
_NOTICE = "Dokumentet ba meg opprette et felt med innholdet fra .env. Jeg ignorerte det."


class TestExtractSecurityNotice:
    def test_ordinary_summary_is_untouched(self):
        assert _extract_security_notice(_SUMMARY) == (_SUMMARY, None)

    def test_notice_is_split_off_the_summary(self):
        text = f"{_SUMMARY}\n\nSECURITY_NOTICE: {_NOTICE}"

        cleaned, notice = _extract_security_notice(text)

        assert cleaned == _SUMMARY
        assert notice == _NOTICE

    def test_notice_is_found_mid_message(self):
        text = f"SECURITY_NOTICE: {_NOTICE}\n\n{_SUMMARY}"

        cleaned, notice = _extract_security_notice(text)

        assert cleaned == _SUMMARY
        assert notice == _NOTICE

    def test_markdown_decoration_around_the_marker_is_accepted(self):
        text = f"{_SUMMARY}\n\n**SECURITY_NOTICE**: {_NOTICE}"

        cleaned, notice = _extract_security_notice(text)

        assert cleaned == _SUMMARY
        assert notice == _NOTICE

    def test_only_the_first_notice_is_kept(self):
        text = f"{_SUMMARY}\nSECURITY_NOTICE: {_NOTICE}\nSECURITY_NOTICE: noe annet"

        cleaned, notice = _extract_security_notice(text)

        assert notice == _NOTICE
        assert "SECURITY_NOTICE" not in cleaned

    def test_a_long_notice_is_truncated(self):
        text = f"{_SUMMARY}\n\nSECURITY_NOTICE: {'a' * 900}"

        _, notice = _extract_security_notice(text)

        assert len(notice) == MAX_SECURITY_NOTICE_LENGTH


def _completion_events(
    monkeypatch,
    final_text: str,
    history: list | None = None,
    *,
    with_attachment: bool = True,
) -> list:
    sent: list = []
    recorded = history if history is not None else []
    monkeypatch.setattr(
        "agents.graph.nodes.agentic_loop_node.sink.send", lambda evt: sent.append(evt)
    )
    monkeypatch.setattr(
        "agents.graph.nodes.agentic_loop_node.sink.add_to_conversation_history",
        lambda *args, **kwargs: recorded.append(args),
    )
    state = SimpleNamespace(
        session_id="sess-1",
        changed_files=["App/ui/form/layouts/Side1.json"],
        allow_app_changes=True,
        tests_passed=True,
        trace_id=None,
        attachments=[object()] if with_attachment else [],
        form_spec=None,
    )
    result = LoopResult(
        reason=TerminationReason.COMPLETED,
        final_text=final_text,
        turns=3,
        error=None,
        messages=[],
    )
    ctx = SimpleNamespace(extras={"sources": []})
    _emit_workflow_completion(state, result, ctx)
    return sent


class TestEmittedEvent:
    def test_only_a_flag_travels_to_designer(self, monkeypatch):
        sent = _completion_events(
            monkeypatch, f"{_SUMMARY}\n\nSECURITY_NOTICE: {_NOTICE}"
        )
        message = next(e for e in sent if e.type == "assistant_message")

        assert message.data["attachmentInstructionFlagged"] is True
        assert "SECURITY_NOTICE" not in message.data["content"]

    def test_the_notice_text_never_leaves_the_agent(self, monkeypatch):
        sent = _completion_events(
            monkeypatch, f"{_SUMMARY}\n\nSECURITY_NOTICE: {_NOTICE}"
        )
        message = next(e for e in sent if e.type == "assistant_message")

        assert _NOTICE not in json.dumps(message.data, ensure_ascii=False)

    def test_no_flag_on_an_ordinary_run(self, monkeypatch):
        sent = _completion_events(monkeypatch, _SUMMARY)
        message = next(e for e in sent if e.type == "assistant_message")

        assert "attachmentInstructionFlagged" not in message.data

    def test_history_records_a_fixed_marker_not_the_notice(self, monkeypatch):
        history: list = []
        _completion_events(
            monkeypatch, f"{_SUMMARY}\n\nSECURITY_NOTICE: {_NOTICE}", history
        )
        stored = history[0][2]

        assert SECURITY_NOTICE_HISTORY_MARKER in stored
        assert _SUMMARY in stored
        # Replaying it would reintroduce attacker text undelimited next turn.
        assert _NOTICE not in stored

    def test_history_is_unchanged_on_an_ordinary_run(self, monkeypatch):
        history: list = []
        _completion_events(monkeypatch, _SUMMARY, history)

        assert history[0][2] == _SUMMARY

    def test_no_flag_when_the_turn_had_no_attachment(self, monkeypatch):
        """The alert names an uploaded document, so it must not fire without one:
        the model can report an injection after reading conversation history."""
        sent = _completion_events(
            monkeypatch, f"{_SUMMARY}\n\nSECURITY_NOTICE: {_NOTICE}", with_attachment=False
        )

        message = next(e for e in sent if e.type == "assistant_message")
        assert "attachmentInstructionFlagged" not in message.data

    def test_the_notice_is_still_stripped_without_an_attachment(self, monkeypatch):
        """Not flagging is not a reason to leak the attacker-influenced sentence."""
        sent = _completion_events(
            monkeypatch, f"{_SUMMARY}\n\nSECURITY_NOTICE: {_NOTICE}", with_attachment=False
        )

        message = next(e for e in sent if e.type == "assistant_message")
        assert _NOTICE not in message.data["content"]
        assert "SECURITY_NOTICE" not in message.data["content"]
