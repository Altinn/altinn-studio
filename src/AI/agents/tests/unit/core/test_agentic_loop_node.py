"""Tests for the agentic_loop_node and its wiring into the graph.

We monkeypatch `run_loop` and `build_adapter` so the node runs
end-to-end without a real LLM.  Behavior we assert:

- The right tool set is registered (all in-process).
- The event bridge translates loop events to AgentEvent payloads.
- Loop results map onto AgentState's legacy fields.
- The graph builder produces a compiled graph with the expected nodes.
"""

from __future__ import annotations

import os
from typing import Any

import pytest

from agents.core import (
    LoopContext,
    LoopResult,
    TerminationReason,
)
from agents.graph.nodes.agentic_loop_node import (
    _apply_result_to_state,
    _build_registry,
    _final_summary_text,
    _make_event_bridge,
    handle,
)
from agents.graph.state import AgentState


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _state(**overrides: Any) -> AgentState:
    base = dict(
        session_id="sess-1",
        user_goal="add a date field",
        repo_path="/tmp/repo",
        app_name="test-app",
        developer="dev",
        org="ttd",
    )
    base.update(overrides)
    return AgentState(**base)


# ---------------------------------------------------------------------------
# Registry composition
# ---------------------------------------------------------------------------


class TestBuildRegistry:
    def test_internal_tools_always_present(self):
        registry = _build_registry()
        names = set(registry.names())
        assert {
            "scan_repo",
            "read_file",
            "edit_file",
            "write_file",
            "discard_file_changes",
            "verify_changes",
            "commit_session_branch",
        }.issubset(names)

    def test_altinn_tools_registered(self):
        """The former MCP capabilities are now in-process tools."""
        registry = _build_registry()
        assert "altinn_layout_props" in registry
        assert "altinn_datamodel_sync" in registry
        assert "web_fetch" in registry

    def test_skill_tool_registered_with_discovered_skills(self):
        registry = _build_registry()
        assert "skill" in registry


# ---------------------------------------------------------------------------
# Event bridge
# ---------------------------------------------------------------------------


class TestEventBridge:
    def test_lookup_tool_call_emits_trail_status(self, monkeypatch):
        """Lookups surface as friendly Norwegian trail statuses (the
        frontend ActivityTrail renders one row per status).  The raw
        tool name must never leak into the message."""
        seen: list = []
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        bridge = _make_event_bridge("sess-1")
        bridge("tool_call", {"id": "1", "name": "scan_repo", "input": {}})
        bridge("tool_call", {"id": "2", "name": "altinn_layout_list", "input": {}})
        assert len(seen) == 2
        assert seen[0].data["message"] == "Skanner repo"
        assert "altinn_layout_list" not in seen[1].data["message"]

    def test_skill_tool_call_emits_status_with_skill_name(self, monkeypatch):
        seen: list = []
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        bridge = _make_event_bridge("sess-1")
        bridge("tool_call", {"id": "1", "name": "skill", "input": {"skill": "altinn-policy"}})
        assert len(seen) == 1
        assert "altinn-policy" in seen[0].data["message"]

    def test_action_tool_call_emits_friendly_status(self, monkeypatch):
        """The load-bearing write tools (edit_file, write_file,
        commit_session_branch, …) DO surface a status — and in the
        user's language, not with the internal tool name."""
        seen: list = []
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        bridge = _make_event_bridge("sess-1")
        bridge("tool_call", {"id": "1", "name": "edit_file", "input": {}})
        bridge("tool_call", {"id": "2", "name": "commit_session_branch", "input": {}})
        assert len(seen) == 2
        assert seen[0].type == "status"
        # Norwegian status; the literal tool name must not leak.
        assert "edit_file" not in seen[0].data["message"]
        assert "fil" in seen[0].data["message"].lower() or "endrer" in seen[0].data["message"].lower()
        assert "commit_session_branch" not in seen[1].data["message"]

    def test_mid_loop_assistant_message_emits_no_status(self, monkeypatch):
        """The model's narration streams to the UI via
        `assistant_message_chunk` (text_delta flushes) — the
        `assistant_message` loop event itself must not spawn a status
        or a chat bubble."""
        seen: list = []
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        bridge = _make_event_bridge("sess-1")
        bridge(
            "assistant_message",
            {"turn": 1, "text": "Nå leser jeg layouten…", "stop_reason": "tool_use"},
        )
        assert seen == []

    def test_final_assistant_message_suppressed_in_bridge(self, monkeypatch):
        """The terminal turn (stop_reason='end_turn') is handled by
        `_emit_workflow_completion` with the real `filesChanged` list.
        The bridge must NOT also emit it, or the UI shows the summary
        twice."""
        seen: list = []
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        bridge = _make_event_bridge("sess-1")
        bridge(
            "assistant_message",
            {"turn": 4, "text": "✅ Done.", "stop_reason": "end_turn"},
        )
        assert seen == []

    def test_empty_assistant_message_ignored(self, monkeypatch):
        seen: list = []
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        bridge = _make_event_bridge("sess-1")
        bridge("assistant_message", {"turn": 1, "text": "   ", "stop_reason": "tool_use"})
        assert seen == []

    def test_assistant_message_empty_text_skipped(self, monkeypatch):
        seen: list = []
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        bridge = _make_event_bridge("sess-1")
        bridge("assistant_message", {"turn": 1, "text": "   ", "stop_reason": "tool_use"})
        assert seen == []

    def test_other_events_log_only(self, monkeypatch):
        seen: list = []
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        bridge = _make_event_bridge("sess-1")
        bridge("turn_start", {"turn": 1, "messages": 2})
        bridge("tool_result", {"id": "1", "is_error": False, "chars": 100})
        bridge("compacted", {"turn": 5, "from": 30, "to": 10})
        bridge("terminated", {"reason": "completed", "turn": 3})
        assert seen == []  # none of these should hit the user-facing sink


# ---------------------------------------------------------------------------
# State translation
# ---------------------------------------------------------------------------


class TestFinalSummaryText:
    """The fallback summary must reflect the actual termination reason.
    The previous default of 'Workflow completed.' on every reason made
    max_turns / error look like success in the UI."""

    def test_completed_uses_model_text(self):
        result = LoopResult(
            reason=TerminationReason.COMPLETED,
            messages=[],
            final_text="Lagt til feltet 'epost'.",
            turns=3,
        )
        assert _final_summary_text(result) == "Lagt til feltet 'epost'."

    def test_completed_without_text_has_neutral_fallback(self):
        result = LoopResult(reason=TerminationReason.COMPLETED, messages=[], turns=1)
        # Must not lie about success, but also doesn't need to be alarming.
        assert _final_summary_text(result) == "Ferdig."

    def test_max_turns_explains_what_happened(self):
        result = LoopResult(reason=TerminationReason.MAX_TURNS, messages=[], turns=20)
        summary = _final_summary_text(result)
        assert "20 steg" in summary
        assert "ikke" in summary.lower()  # must clearly signal failure
        assert "Workflow completed" not in summary

    def test_cancelled_signals_cancellation(self):
        result = LoopResult(reason=TerminationReason.CANCELLED, messages=[], turns=1)
        assert "avbrutt" in _final_summary_text(result).lower()

    def test_error_includes_reason(self):
        result = LoopResult(
            reason=TerminationReason.ERROR,
            messages=[],
            error="network down",
            turns=1,
        )
        summary = _final_summary_text(result)
        assert "feil" in summary.lower()
        assert "network down" in summary


class TestApplyResultToState:
    def _ctx_with(self, **extras: Any) -> LoopContext:
        ctx = LoopContext(
            session_id="s1",
            repo_path="/repo",
            allow_app_changes=True,
        )
        ctx.extras.update(extras)
        return ctx

    def test_completed_marks_passed_and_clears_notes(self):
        state = _state()
        result = LoopResult(
            reason=TerminationReason.COMPLETED,
            messages=[],
            final_text="Added date field.",
            turns=3,
        )
        ctx = self._ctx_with(changed_files={"Side1/layout.json"})
        _apply_result_to_state(state, result, ctx)
        assert state.tests_passed is True
        assert state.verify_notes == []
        assert state.changed_files == ["Side1/layout.json"]
        assert state.assistant_response == {"text": "Added date field."}
        assert state.next_action == "stop"

    def test_max_turns_marks_failed_with_explanation(self):
        state = _state()
        result = LoopResult(
            reason=TerminationReason.MAX_TURNS,
            messages=[],
            turns=20,
        )
        _apply_result_to_state(state, result, self._ctx_with())
        assert state.tests_passed is False
        assert any("max_turns" in n for n in state.verify_notes)

    def test_cancelled_marks_failed(self):
        state = _state()
        result = LoopResult(
            reason=TerminationReason.CANCELLED, messages=[], turns=1
        )
        _apply_result_to_state(state, result, self._ctx_with())
        assert state.tests_passed is False
        assert "cancelled" in state.verify_notes[0].lower()

    def test_error_includes_error_message(self):
        state = _state()
        result = LoopResult(
            reason=TerminationReason.ERROR,
            messages=[],
            error="network down",
            turns=1,
        )
        _apply_result_to_state(state, result, self._ctx_with())
        assert state.tests_passed is False
        assert "network down" in state.verify_notes[0]

    def test_changed_files_sorted_for_stable_output(self):
        state = _state()
        result = LoopResult(reason=TerminationReason.COMPLETED, messages=[], turns=1)
        ctx = self._ctx_with(changed_files={"z.json", "a.json", "m.json"})
        _apply_result_to_state(state, result, ctx)
        assert state.changed_files == ["a.json", "m.json", "z.json"]


# ---------------------------------------------------------------------------
# Node end-to-end (run_loop monkeypatched)
# ---------------------------------------------------------------------------


class TestHandle:
    async def test_invokes_run_loop_with_expected_inputs(self, monkeypatch):
        captured: dict[str, Any] = {}

        async def fake_run_loop(**kwargs):
            captured.update(kwargs)
            # Simulate the patch tool writing a file via ctx.
            kwargs["ctx"].extras["changed_files"] = {"Side1/layout.json"}
            return LoopResult(
                reason=TerminationReason.COMPLETED,
                messages=[],
                final_text="done",
                turns=2,
            )

        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.run_loop", fake_run_loop
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.build_adapter",
            lambda role: object(),  # adapter is never invoked since run_loop is faked
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: None,
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.is_cancelled",
            lambda sid: False,
        )

        state = _state()
        result = await handle(state)

        # run_loop received the wiring we expect.
        assert captured["user_message"] == "add a date field"
        assert isinstance(captured["system_prompt"], str)
        assert "Altinity" in captured["system_prompt"]
        assert captured["registry"].names()  # not empty
        # Loop ctx echoes session info.
        assert captured["ctx"].session_id == "sess-1"
        assert captured["ctx"].allow_app_changes is True

        # State was translated correctly.
        assert result.tests_passed is True
        assert result.changed_files == ["Side1/layout.json"]
        assert result.assistant_response == {"text": "done"}

    async def test_emits_done_and_final_assistant_message(self, monkeypatch):
        """The frontend needs both events to close out a workflow.  This
        test guards the regression where the agentic loop terminated
        without emitting them and Designer's checkout fired prematurely."""

        async def fake_run_loop(**kwargs):
            kwargs["ctx"].extras["changed_files"] = {"Side1/layout.json", "model.schema.json"}
            return LoopResult(
                reason=TerminationReason.COMPLETED,
                messages=[],
                final_text="Added email field.",
                turns=2,
            )

        seen: list = []

        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.run_loop", fake_run_loop
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.build_adapter", lambda role: object()
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send",
            lambda evt: seen.append(evt),
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.is_cancelled",
            lambda sid: False,
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.add_to_conversation_history",
            lambda sid, role, text: None,
        )

        await handle(_state())

        # The last two events must be the final assistant_message + done.
        assert seen[-2].type == "assistant_message"
        assert seen[-2].data["content"] == "Added email field."
        assert sorted(seen[-2].data["filesChanged"]) == ["Side1/layout.json", "model.schema.json"]
        assert seen[-1].type == "done"
        assert seen[-1].data["success"] is True
        assert sorted(seen[-1].data["changed_files"]) == ["Side1/layout.json", "model.schema.json"]

    async def test_error_termination_marks_state_failed(self, monkeypatch):
        async def fake_run_loop(**kwargs):
            return LoopResult(
                reason=TerminationReason.ERROR,
                messages=[],
                error="adapter exploded",
                turns=1,
            )

        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.run_loop", fake_run_loop
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.build_adapter", lambda role: object()
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send", lambda evt: None
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.is_cancelled",
            lambda sid: False,
        )

        result = await handle(_state())
        assert result.tests_passed is False
        assert "adapter exploded" in result.verify_notes[0]


# ---------------------------------------------------------------------------
# Graph builder + feature flag
# ---------------------------------------------------------------------------


class TestAutoCommitSafetyNet:
    """When the loop terminates with uncommitted changes (max_turns, stuck,
    or error) and the model never called commit_session_branch itself, the
    node should auto-commit so partial work isn't lost on the floor."""

    async def test_auto_commits_on_max_turns_with_changes(self, monkeypatch):
        async def fake_run_loop(**kwargs):
            kwargs["ctx"].extras["changed_files"] = {"App/ui/x.json"}
            # Note: ctx.extras["session_committed"] NOT set — model didn't
            # commit.
            return LoopResult(
                reason=TerminationReason.MAX_TURNS,
                messages=[],
                turns=20,
            )

        seen: list = []

        def fake_commit_run(*args, **kwargs):
            # CommitSessionBranchTool.run is async — return an awaitable.
            from agents.core import ToolResult

            async def _coro():
                seen.append("auto-commit-called")
                return ToolResult(content="Committed deadbee0 to branch and pushed.")
            return _coro()

        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.run_loop", fake_run_loop
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.build_adapter", lambda role: object()
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send", lambda evt: None
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.is_cancelled", lambda sid: False
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.add_to_conversation_history",
            lambda sid, role, text: None,
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.CommitSessionBranchTool.run",
            fake_commit_run,
        )

        await handle(_state())
        assert seen == ["auto-commit-called"]

    async def test_skips_auto_commit_when_model_already_committed(self, monkeypatch):
        async def fake_run_loop(**kwargs):
            kwargs["ctx"].extras["changed_files"] = {"f.json"}
            kwargs["ctx"].extras["session_committed"] = True
            return LoopResult(
                reason=TerminationReason.COMPLETED,
                messages=[],
                final_text="done",
                turns=4,
            )

        called = {"n": 0}

        def fake_commit_run(*args, **kwargs):
            from agents.core import ToolResult

            async def _coro():
                called["n"] += 1
                return ToolResult(content="should not be called")
            return _coro()

        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.run_loop", fake_run_loop
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.build_adapter", lambda role: object()
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send", lambda evt: None
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.is_cancelled", lambda sid: False
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.add_to_conversation_history",
            lambda sid, role, text: None,
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.CommitSessionBranchTool.run",
            fake_commit_run,
        )

        await handle(_state())
        assert called["n"] == 0  # model's own commit was honored

    async def test_skips_auto_commit_when_no_changes(self, monkeypatch):
        async def fake_run_loop(**kwargs):
            # No changes recorded at all.
            return LoopResult(
                reason=TerminationReason.MAX_TURNS,
                messages=[],
                turns=20,
            )

        called = {"n": 0}

        def fake_commit_run(*args, **kwargs):
            from agents.core import ToolResult

            async def _coro():
                called["n"] += 1
                return ToolResult(content="should not be called")
            return _coro()

        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.run_loop", fake_run_loop
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.build_adapter", lambda role: object()
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.send", lambda evt: None
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.is_cancelled", lambda sid: False
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.sink.add_to_conversation_history",
            lambda sid, role, text: None,
        )
        monkeypatch.setattr(
            "agents.graph.nodes.agentic_loop_node.CommitSessionBranchTool.run",
            fake_commit_run,
        )

        await handle(_state())
        assert called["n"] == 0


class TestGraphBuilder:
    def test_build_graph_has_agentic_nodes_only(self):
        from agents.graph.runner import build_graph

        compiled = build_graph()
        # Compiled LangGraph exposes the node names on `.nodes`.
        node_names = set(getattr(compiled, "nodes", {}).keys())
        assert {"intake", "spec", "agentic_loop"}.issubset(node_names)
        # Legacy pipeline nodes were removed in the agentic cleanup.
        for legacy in ("planner", "actor", "verifier", "reviewer", "scan", "planning_tool"):
            assert legacy not in node_names
