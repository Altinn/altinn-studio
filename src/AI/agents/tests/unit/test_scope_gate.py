"""Tests for the scope gate: the classifier parsing and the runner wiring.

The classifier LLM call is mocked throughout — these tests pin the
contract: fail-open on classifier errors, write-mode rejection via
GoalRejected, and the read-only decline delivered as a normal chat turn.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.graph.runner import GoalRejected, WorkflowCancelled, _gate_goal
from agents.graph.state import AgentState
from agents.services.llm.scope_checker import ScopeCheckResult, check_scope_async


def _state(**overrides) -> AgentState:
    base = dict(
        session_id="sess-1",
        user_goal="hjelp meg planlegge min japanreise",
        repo_path="/tmp/repo",
        app_name="test-app",
        developer="dev",
        org="ttd",
    )
    base.update(overrides)
    return AgentState(**base)


class TestCheckScopeAsync:
    async def test_parses_an_out_of_scope_verdict(self):
        client = MagicMock()
        client.call_async = AsyncMock(
            return_value='{"in_scope": false, "decline_message": "Jeg kan bare hjelpe med Altinn.", "reason": "travel"}'
        )
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("planlegg japanreisen min")

        assert result.in_scope is False
        assert result.decline_message == "Jeg kan bare hjelpe med Altinn."

    async def test_strips_markdown_fences_around_the_json(self):
        client = MagicMock()
        client.call_async = AsyncMock(
            return_value='```json\n{"in_scope": true, "decline_message": null, "reason": "layout"}\n```'
        )
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("legg til et tekstfelt")

        assert result.in_scope is True

    async def test_fails_open_when_the_classifier_call_fails(self):
        client = MagicMock()
        client.call_async = AsyncMock(side_effect=RuntimeError("LLM down"))
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("legg til et tekstfelt")

        assert result.in_scope is True

    async def test_fails_open_when_in_scope_is_not_a_boolean(self):
        client = MagicMock()
        client.call_async = AsyncMock(
            return_value='{"in_scope": "false", "decline_message": "Nei.", "reason": "travel"}'
        )
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("planlegg japanreisen min")

        assert result.in_scope is True

    async def test_fails_open_on_unparseable_output(self):
        client = MagicMock()
        client.call_async = AsyncMock(return_value="Sorry, I cannot classify that.")
        with (
            patch("agents.services.llm.scope_checker.get_llm_client", return_value=client),
            patch(
                "agents.services.llm.scope_checker.get_prompt_with_langfuse",
                return_value=("system", None),
            ),
        ):
            result = await check_scope_async("legg til et tekstfelt")

        assert result.in_scope is True


def _sink(cancelled: bool = False) -> MagicMock:
    sink = MagicMock()
    sink.is_cancelled.return_value = cancelled
    return sink


class TestGateGoal:
    def _out_of_scope(self):
        return ScopeCheckResult(
            in_scope=False,
            decline_message="Jeg kan bare hjelpe med Altinn-apputvikling.",
            reason="travel planning",
        )

    async def test_write_mode_rejects_out_of_scope_goals(self):
        state = _state(allow_app_changes=True)
        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=self._out_of_scope()),
        ):
            with pytest.raises(GoalRejected, match="Altinn-apputvikling"):
                await _gate_goal(state, event_sink=_sink())

    async def test_write_mode_strips_pipes_from_the_decline_text(self):
        state = _state(allow_app_changes=True)
        piped = ScopeCheckResult(
            in_scope=False,
            decline_message="Jeg kan bare hjelpe med Altinn | ikke reiseplanlegging.",
            reason="travel planning",
        )
        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=piped),
        ):
            with pytest.raises(GoalRejected) as excinfo:
                await _gate_goal(state, event_sink=_sink())

        # The "reason|suggestions" protocol splits on "|" — the decline text
        # must not contain one, or it spills into fake suggestion chips.
        assert "|" not in str(excinfo.value)

    async def test_read_only_declines_as_a_normal_chat_turn(self):
        state = _state(allow_app_changes=False)
        event_sink = _sink()
        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=self._out_of_scope()),
        ):
            decline = await _gate_goal(state, event_sink=event_sink)

        assert decline == "Jeg kan bare hjelpe med Altinn-apputvikling."
        sent_types = [call.args[0].type for call in event_sink.send.call_args_list]
        assert sent_types == ["assistant_message", "status"]
        message_event = event_sink.send.call_args_list[0].args[0]
        assert message_event.data["content"] == decline
        assert message_event.data["no_branch_operations"] is True
        status_event = event_sink.send.call_args_list[1].args[0]
        assert status_event.data["done"] is True
        assert status_event.data["success"] is True
        event_sink.add_to_conversation_history.assert_called_once_with(
            "sess-1", "assistant", decline
        )

    async def test_in_scope_write_mode_runs_intent_validation(self):
        state = _state(allow_app_changes=True, user_goal="legg til et tekstfelt")
        in_scope = ScopeCheckResult(in_scope=True, reason="layout")
        with (
            patch(
                "agents.graph.runner.check_scope_async",
                new=AsyncMock(return_value=in_scope),
            ),
            patch(
                "agents.graph.runner._validate_intent", new=AsyncMock()
            ) as validate_intent,
        ):
            decline = await _gate_goal(state, event_sink=_sink())

        assert decline is None
        validate_intent.assert_awaited_once_with(state)

    async def test_in_scope_read_only_skips_intent_validation(self):
        state = _state(allow_app_changes=False, user_goal="hvordan fungerer uttrykk?")
        in_scope = ScopeCheckResult(in_scope=True, reason="Altinn concept question")
        with (
            patch(
                "agents.graph.runner.check_scope_async",
                new=AsyncMock(return_value=in_scope),
            ),
            patch(
                "agents.graph.runner._validate_intent", new=AsyncMock()
            ) as validate_intent,
        ):
            decline = await _gate_goal(state, event_sink=_sink())

        assert decline is None
        validate_intent.assert_not_awaited()

    async def test_cancelling_during_the_scope_check_stops_the_turn(self):
        state = _state(allow_app_changes=False)
        event_sink = _sink()
        event_sink.is_cancelled.side_effect = [False, True]
        with patch(
            "agents.graph.runner.check_scope_async",
            new=AsyncMock(return_value=self._out_of_scope()),
        ):
            with pytest.raises(WorkflowCancelled):
                await _gate_goal(state, event_sink=event_sink)

        event_sink.send.assert_not_called()
        event_sink.add_to_conversation_history.assert_not_called()

    async def test_a_cancelled_session_never_calls_the_scope_check(self):
        state = _state(allow_app_changes=False)
        with patch(
            "agents.graph.runner.check_scope_async", new=AsyncMock()
        ) as check_scope:
            with pytest.raises(WorkflowCancelled):
                await _gate_goal(state, event_sink=_sink(cancelled=True))

        check_scope.assert_not_awaited()
