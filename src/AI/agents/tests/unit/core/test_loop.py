"""Tests for the agentic loop.

These tests use the FakeAdapter from conftest — no network, no real
LLM.  They exercise the loop's control flow exhaustively: termination
conditions, tool dispatch (validation + permission + error paths), and
the safe/unsafe concurrency rules.
"""

from __future__ import annotations

import asyncio

import pytest

from agents.core import (
    AssistantMessage,
    CompactionConfig,
    LoopContext,
    TerminationReason,
    TextBlock,
    ToolRegistry,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    run_loop,
)

from .conftest import (
    BoomTool,
    CountingTool,
    DeniedTool,
    EchoTool,
    FakeAdapter,
    GatedTool,
    SourcedTool,
    tool_use,
)


# ---------------------------------------------------------------------------
# Termination
# ---------------------------------------------------------------------------


class TestHistory:
    async def test_history_is_prepended_before_current_message(self, ctx):
        adapter = FakeAdapter(
            [AssistantMessage(content=[TextBlock(text="svar")], stop_reason="end_turn")]
        )
        history = [
            UserMessage(content="Lag en oppsummeringsside"),
            AssistantMessage(content=[TextBlock(text="Laget Summary-siden.")]),
        ]

        result = await run_loop(
            user_message="Hva endret du?",
            system_prompt="sys",
            registry=ToolRegistry(),
            adapter=adapter,
            ctx=ctx,
            history=history,
        )

        sent = adapter.calls[0]["messages"]
        assert sent[0].content == "Lag en oppsummeringsside"
        assert sent[1].role == "assistant"
        assert sent[2].content == "Hva endret du?"
        assert result.reason is TerminationReason.COMPLETED


def _gated_registry() -> ToolRegistry:
    registry = ToolRegistry()
    registry.register(GatedTool())
    return registry


def _sourced_registry() -> ToolRegistry:
    registry = ToolRegistry()
    registry.register(SourcedTool())
    registry.register(EchoTool())
    return registry


class TestSourceCollection:
    async def test_successful_knowledge_tool_records_source(self, ctx):
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[
                        tool_use("sourced", text="expressions"),
                        tool_use("echo", text="no source here"),
                    ],
                    stop_reason="tool_use",
                ),
                AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn"),
            ]
        )

        await run_loop(
            user_message="hva er uttrykk?",
            system_prompt="sys",
            registry=_sourced_registry(),
            adapter=adapter,
            ctx=ctx,
        )

        assert ctx.extras["sources"] == [
            {
                "title": "expressions",
                "url": "https://docs.altinn.studio/expressions",
                "kind": "docs",
            }
        ]

    async def test_repeated_lookups_are_deduplicated(self, ctx):
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("sourced", text="expressions")], stop_reason="tool_use"
                ),
                AssistantMessage(
                    content=[tool_use("sourced", text="expressions")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn"),
            ]
        )

        await run_loop(
            user_message="hva er uttrykk?",
            system_prompt="sys",
            registry=_sourced_registry(),
            adapter=adapter,
            ctx=ctx,
        )

        assert len(ctx.extras["sources"]) == 1

    async def test_failed_lookup_records_no_source(self, ctx):
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("sourced", text="fail")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn"),
            ]
        )

        await run_loop(
            user_message="hva er uttrykk?",
            system_prompt="sys",
            registry=_sourced_registry(),
            adapter=adapter,
            ctx=ctx,
        )

        assert ctx.extras.get("sources", []) == []


class TestPermissionEscalation:
    def _read_only_ctx(self, requester) -> LoopContext:
        return LoopContext(
            session_id="test-session",
            repo_path="/tmp/test-repo",
            allow_app_changes=False,
            permission_requester=requester,
        )

    async def test_grant_upgrades_session_and_runs_tool(self):
        asked: list[str] = []

        async def grant(action: str) -> bool:
            asked.append(action)
            return True

        ctx = self._read_only_ctx(grant)
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("gated", text="hello")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="do it",
            system_prompt="sys",
            registry=_gated_registry(),
            adapter=adapter,
            ctx=ctx,
        )

        assert asked and "gated" in asked[0]
        assert ctx.allow_app_changes is True
        tool_results = [
            b for b in adapter.calls[1]["messages"][-1].content
            if isinstance(b, ToolResultBlock)
        ]
        assert tool_results[0].is_error is False
        assert "wrote: hello" in tool_results[0].content
        assert result.reason is TerminationReason.COMPLETED

    async def test_decline_denies_and_blocks_further_asks(self):
        asks: list[str] = []

        async def decline(action: str) -> bool:
            asks.append(action)
            return False

        ctx = self._read_only_ctx(decline)
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("gated", text="a")], stop_reason="tool_use"
                ),
                AssistantMessage(
                    content=[tool_use("gated", text="b")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        await run_loop(
            user_message="do it",
            system_prompt="sys",
            registry=_gated_registry(),
            adapter=adapter,
            ctx=ctx,
        )

        # Asked exactly once; the second attempt is refused without re-asking.
        assert len(asks) == 1
        assert ctx.allow_app_changes is False
        second_turn_results = [
            b for b in adapter.calls[2]["messages"][-1].content
            if isinstance(b, ToolResultBlock)
        ]
        assert second_turn_results[0].is_error is True
        assert "already declined" in second_turn_results[0].content

    async def test_no_requester_means_plain_denial(self):
        ctx = self._read_only_ctx(None)
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("gated", text="x")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        await run_loop(
            user_message="do it",
            system_prompt="sys",
            registry=_gated_registry(),
            adapter=adapter,
            ctx=ctx,
        )
        results = [
            b for b in adapter.calls[1]["messages"][-1].content
            if isinstance(b, ToolResultBlock)
        ]
        assert results[0].is_error is True
        assert "read-only session" in results[0].content


class TestTermination:
    async def test_completed_when_no_tool_use(self, ctx):
        adapter = FakeAdapter(
            [AssistantMessage(content=[TextBlock(text="all done")], stop_reason="end_turn")]
        )
        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=ToolRegistry(),
            adapter=adapter,
            ctx=ctx,
        )
        assert result.reason is TerminationReason.COMPLETED
        assert result.final_text == "all done"
        assert result.turns == 1
        # User goal + one assistant reply
        assert len(result.messages) == 2

    async def test_max_turns(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())
        # Adapter that always calls echo — never finishes naturally.
        # Each call uses a unique input so anti-thrash doesn't fire
        # (this test is specifically exercising max_turns, not STUCK).
        adapter = FakeAdapter()
        for i in range(10):
            adapter.queue(
                AssistantMessage(
                    content=[tool_use("echo", text=f"ping-{i}")],
                    stop_reason="tool_use",
                )
            )
        result = await run_loop(
            user_message="loop me",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
            max_turns=3,
        )
        assert result.reason is TerminationReason.MAX_TURNS
        assert result.turns == 3
        assert result.final_text is None

    async def test_cancelled_before_first_turn(self, ctx):
        adapter = FakeAdapter([AssistantMessage(content=[TextBlock(text="x")])])
        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=ToolRegistry(),
            adapter=adapter,
            ctx=ctx,
            is_cancelled=lambda: True,
        )
        assert result.reason is TerminationReason.CANCELLED
        assert adapter.calls == []  # never reached the LLM

    async def test_cancel_during_final_text_turn_prevents_completion(self, ctx):
        """Chat-style runs are often a single streaming turn with no tool
        calls — a cancel during that stream must not be returned as a
        normal completion carrying the answer."""
        adapter = FakeAdapter(
            [AssistantMessage(content=[TextBlock(text="the answer")], stop_reason="end_turn")]
        )
        checks = {"count": 0}

        def is_cancelled() -> bool:
            checks["count"] += 1
            # Turn-start check passes; the post-response check sees the cancel.
            return checks["count"] > 1

        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=ToolRegistry(),
            adapter=adapter,
            ctx=ctx,
            is_cancelled=is_cancelled,
        )

        assert result.reason is TerminationReason.CANCELLED
        assert result.final_text is None


class TestTruncation:
    """A max_tokens cut must never masquerade as a normal completion —
    the adapter drops the malformed trailing tool_use, so the response
    can look like innocent text with zero tool calls."""

    async def test_truncated_text_only_turn_triggers_recovery_not_completion(self, ctx):
        adapter = FakeAdapter(
            [
                # Turn 1: cut mid-batch — tool_use was dropped, text remains.
                AssistantMessage(content=[TextBlock(text="writing files…")], stop_reason="max_tokens"),
                # Turn 2 (after recovery prompt): finishes properly.
                AssistantMessage(content=[TextBlock(text="all done")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=ToolRegistry(),
            adapter=adapter,
            ctx=ctx,
        )
        assert result.reason is TerminationReason.COMPLETED
        assert result.final_text == "all done"
        assert result.turns == 2
        # The recovery user message went to the model on turn 2.
        second_call_messages = adapter.calls[1]["messages"]
        recovery = second_call_messages[-1]
        assert "cut off at the output-token limit" in str(recovery.content)

    async def test_repeated_truncation_terminates_with_error(self, ctx):
        adapter = FakeAdapter(
            [
                AssistantMessage(content=[TextBlock(text="…")], stop_reason="max_tokens"),
                AssistantMessage(content=[TextBlock(text="…")], stop_reason="max_tokens"),
                AssistantMessage(content=[TextBlock(text="…")], stop_reason="max_tokens"),
            ]
        )
        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=ToolRegistry(),
            adapter=adapter,
            ctx=ctx,
        )
        assert result.reason is TerminationReason.ERROR
        assert "max_tokens" in (result.error or "")

    async def test_truncated_turn_with_surviving_tools_gets_partial_notice(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())
        adapter = FakeAdapter(
            [
                # Turn 1: one tool call survived the cut.
                AssistantMessage(
                    content=[tool_use("echo", text="a")], stop_reason="max_tokens"
                ),
                AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        assert result.reason is TerminationReason.COMPLETED
        # The tool-results message the model saw on turn 2 carries the
        # truncation notice after the results.
        second_call_messages = adapter.calls[1]["messages"]
        results_msg = second_call_messages[-1]
        rendered = str(results_msg.content)
        assert "did NOT execute" in rendered

    async def test_cancelled_between_turns(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("echo", text="a")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn"),
            ]
        )
        seen = {"turns": 0}

        def is_cancelled() -> bool:
            seen["turns"] += 1
            # Cancel after the first turn-start check passes.
            return seen["turns"] > 1

        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
            is_cancelled=is_cancelled,
        )
        assert result.reason is TerminationReason.CANCELLED

    async def test_cancel_during_model_call_skips_tool_execution(self, ctx):
        """A cancel that lands while the model streams must stop the run
        before that turn's tools execute — a cancelled run must not keep
        writing files."""
        registry = ToolRegistry()
        registry.register(CountingTool())
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("counting", text="write-1")], stop_reason="tool_use"
                ),
            ]
        )
        checks = {"count": 0}

        def is_cancelled() -> bool:
            checks["count"] += 1
            # First check (turn start): not cancelled. Second check (after
            # the model response, before tool dispatch): cancelled.
            return checks["count"] > 1

        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
            is_cancelled=is_cancelled,
        )

        assert result.reason is TerminationReason.CANCELLED
        assert ctx.extras.get("calls", []) == []  # the tool never ran

    async def test_adapter_error_propagates_as_error(self, ctx):
        class BoomAdapter(FakeAdapter):
            async def chat(self, *a, **kw):
                raise RuntimeError("network kaput")

        result = await run_loop(
            user_message="hi",
            system_prompt="sys",
            registry=ToolRegistry(),
            adapter=BoomAdapter(),
            ctx=ctx,
        )
        assert result.reason is TerminationReason.ERROR
        assert "network kaput" in (result.error or "")


# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------


class TestToolDispatch:
    async def test_tool_use_then_completion(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("echo", text="hello")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="say hi",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        assert result.reason is TerminationReason.COMPLETED
        # Goal + tool_use assistant + tool_result user + final assistant
        assert len(result.messages) == 4
        results_msg = result.messages[2]
        assert isinstance(results_msg, UserMessage)
        [tr] = results_msg.content
        assert isinstance(tr, ToolResultBlock)
        assert tr.content == "hello"
        assert tr.is_error is False

    async def test_unknown_tool_returns_error_block(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("nope", text="x")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        assert result.reason is TerminationReason.COMPLETED
        [tr] = result.messages[2].content
        assert tr.is_error
        assert "nope" in tr.content
        assert "echo" in tr.content  # lists known tools

    async def test_invalid_args_returns_error_block(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())
        bad = ToolUseBlock(id="t1", name="echo", input={})  # missing `text`
        adapter = FakeAdapter(
            [
                AssistantMessage(content=[bad], stop_reason="tool_use"),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        [tr] = result.messages[2].content
        assert tr.is_error
        assert "Invalid args" in tr.content

    async def test_tool_exception_returns_error_block(self, ctx):
        registry = ToolRegistry()
        registry.register(BoomTool())
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("boom", text="kaboom")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        [tr] = result.messages[2].content
        assert tr.is_error
        assert "boom: kaboom" in tr.content

    async def test_permission_denied_returns_error_block(self, ctx):
        registry = ToolRegistry()
        registry.register(DeniedTool())
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("denied", text="x")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        [tr] = result.messages[2].content
        assert tr.is_error
        assert "denied" in tr.content
        assert "nope" in tr.content

    async def test_results_preserved_in_submission_order(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())
        calls = [
            tool_use("echo", text="first"),
            tool_use("echo", text="second"),
            tool_use("echo", text="third"),
        ]
        adapter = FakeAdapter(
            [
                AssistantMessage(content=list(calls), stop_reason="tool_use"),
                AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn"),
            ]
        )
        result = await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        results = result.messages[2].content
        # Results should line up with the original tool_use order.
        assert [r.content for r in results] == ["first", "second", "third"]
        assert [r.tool_use_id for r in results] == [c.id for c in calls]


# ---------------------------------------------------------------------------
# Concurrency
# ---------------------------------------------------------------------------


class TestConcurrency:
    async def test_safe_tools_run_in_parallel(self, ctx):
        """Two long-sleeping safe tools should overlap, finishing in
        roughly max(t1, t2), not t1 + t2."""

        class SlowEchoTool(EchoTool):
            name = "slow_echo"

            async def run(self, args, ctx):
                await asyncio.sleep(0.1)
                return await super().run(args, ctx)

        registry = ToolRegistry()
        registry.register(SlowEchoTool())

        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[
                        tool_use("slow_echo", text="a"),
                        tool_use("slow_echo", text="b"),
                        tool_use("slow_echo", text="c"),
                    ],
                    stop_reason="tool_use",
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )

        loop_running = asyncio.get_running_loop()
        t0 = loop_running.time()
        await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        elapsed = loop_running.time() - t0
        # 3 * 0.1s serial = 0.3s; parallel should finish well under 0.25s.
        assert elapsed < 0.25, f"safe tools did not run concurrently (took {elapsed:.3f}s)"

    async def test_unsafe_tool_acts_as_barrier(self, ctx):
        """Within a single assistant turn, an unsafe tool must run
        strictly between the safe batch before it and the safe batch
        after it."""

        order: list[str] = []

        class TracingEcho(EchoTool):
            name = "echo"

            async def run(self, args, ctx):
                order.append(f"echo:{args.text}")
                return await super().run(args, ctx)

        class TracingCounter(CountingTool):
            name = "counting"

            async def run(self, args, ctx):
                order.append(f"counting:{args.text}")
                return await super().run(args, ctx)

        registry = ToolRegistry()
        registry.register(TracingEcho())
        registry.register(TracingCounter())

        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[
                        tool_use("echo", text="a"),     # safe
                        tool_use("echo", text="b"),     # safe
                        tool_use("counting", text="C"), # unsafe barrier
                        tool_use("echo", text="d"),     # safe
                    ],
                    stop_reason="tool_use",
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )

        # Safe batch (a,b) runs before counting C; d runs after.
        idx_a = order.index("echo:a")
        idx_b = order.index("echo:b")
        idx_c = order.index("counting:C")
        idx_d = order.index("echo:d")
        assert max(idx_a, idx_b) < idx_c < idx_d

    async def test_safe_batch_respects_concurrency_cap(self, ctx, monkeypatch):
        """Even when the model fires more safe tools than the cap,
        we never run more than `ALTINITY_MAX_TOOL_USE_CONCURRENCY` of
        them at once.  Verified by observing the peak simultaneous
        in-flight count."""

        monkeypatch.setenv("ALTINITY_MAX_TOOL_USE_CONCURRENCY", "2")

        inflight = 0
        peak = 0
        lock = asyncio.Lock()

        class PeakTrackingTool(EchoTool):
            name = "peak_echo"

            async def run(self, args, ctx):
                nonlocal inflight, peak
                async with lock:
                    inflight += 1
                    peak = max(peak, inflight)
                try:
                    # Long enough that the dispatcher would fan out if uncapped.
                    await asyncio.sleep(0.05)
                    return await super().run(args, ctx)
                finally:
                    async with lock:
                        inflight -= 1

        registry = ToolRegistry()
        registry.register(PeakTrackingTool())

        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[
                        tool_use("peak_echo", text=f"n{i}") for i in range(6)
                    ],
                    stop_reason="tool_use",
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        assert peak <= 2, f"cap violated — peak in-flight was {peak}"
        # Sanity: the cap shouldn't trivially read 1, that would mean
        # we accidentally serialized the whole batch.
        assert peak >= 2

    async def test_per_input_predicate_drives_batching(self, ctx):
        """A tool that classifies safety per-input must influence the
        dispatcher.  When `concurrency_safe_for` returns False on a
        specific call, that call should act as a barrier even if the
        class attribute says safe."""

        class PerInputTool(EchoTool):
            name = "per_input"
            is_concurrency_safe = True  # class default optimistic

            def concurrency_safe_for(self, args):
                # Inputs starting with "!" are write-like.
                return not args.text.startswith("!")

            async def run(self, args, ctx):
                await asyncio.sleep(0.05)
                return await super().run(args, ctx)

        registry = ToolRegistry()
        registry.register(PerInputTool())

        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[
                        tool_use("per_input", text="a"),
                        tool_use("per_input", text="!unsafe"),
                        tool_use("per_input", text="b"),
                    ],
                    stop_reason="tool_use",
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )

        loop_running = asyncio.get_running_loop()
        t0 = loop_running.time()
        await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
        )
        elapsed = loop_running.time() - t0
        # 3 calls at 0.05s, fully serial = 0.15s.  Fully parallel = 0.05s.
        # With the !unsafe one as a barrier between (a) and (b), the
        # minimum is ~0.15s (three steps).  If the predicate were
        # ignored and everything ran in parallel, we'd see ~0.05s.
        assert elapsed >= 0.13, (
            f"per-input predicate ignored — elapsed {elapsed:.3f}s suggests "
            "the unsafe call did not act as a barrier"
        )


# ---------------------------------------------------------------------------
# Compaction integration + per-result cap
# ---------------------------------------------------------------------------


class TestResultCapping:
    async def test_oversize_tool_result_is_truncated(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())

        big_text = "x" * 5000
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("echo", text=big_text)], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="ok")], stop_reason="end_turn"),
            ]
        )
        config = CompactionConfig(max_result_chars=100)
        result = await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
            compaction=config,
        )
        [tr] = result.messages[2].content
        # Capped to 100 chars of body + a truncation marker.
        assert tr.content.startswith("x" * 100)
        assert "truncated" in tr.content


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


class TestAntiThrash:
    """If the model calls the same tool with the same input 3 times within
    the recent window, the loop must terminate with TerminationReason.STUCK
    rather than letting it burn through max_turns making the same mistake."""

    async def test_three_identical_calls_terminate_loop(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())

        # Queue five turns, all calling echo(text="same") — same signature.
        adapter = FakeAdapter()
        for _ in range(5):
            adapter.queue(
                AssistantMessage(
                    content=[ToolUseBlock(id=f"id{_}", name="echo", input={"text": "same"})],
                    stop_reason="tool_use",
                )
            )

        result = await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
            max_turns=10,
        )
        assert result.reason is TerminationReason.STUCK
        # Bail before turn 10 — should be around turn 3.
        assert result.turns < 5
        assert result.error and "echo" in result.error

    async def test_different_inputs_do_not_trigger_stuck(self, ctx):
        """Calling the same tool with *different* inputs is fine — only
        identical (name, input) signatures count as repeats."""
        registry = ToolRegistry()
        registry.register(EchoTool())

        adapter = FakeAdapter()
        for i in range(5):
            adapter.queue(
                AssistantMessage(
                    content=[ToolUseBlock(id=f"id{i}", name="echo", input={"text": f"v{i}"})],
                    stop_reason="tool_use",
                )
            )
        # Final clean turn so we don't hit max_turns either.
        adapter.queue(
            AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn")
        )

        result = await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
            max_turns=10,
        )
        assert result.reason is TerminationReason.COMPLETED


class TestEvents:
    async def test_events_emitted_in_expected_order(self, ctx):
        registry = ToolRegistry()
        registry.register(EchoTool())
        adapter = FakeAdapter(
            [
                AssistantMessage(
                    content=[tool_use("echo", text="x")], stop_reason="tool_use"
                ),
                AssistantMessage(content=[TextBlock(text="done")], stop_reason="end_turn"),
            ]
        )

        events: list[tuple[str, dict]] = []

        def listener(name: str, payload: dict) -> None:
            events.append((name, payload))

        await run_loop(
            user_message="x",
            system_prompt="sys",
            registry=registry,
            adapter=adapter,
            ctx=ctx,
            on_event=listener,
        )

        types = [e[0] for e in events]
        assert types[0] == "turn_start"
        assert "tool_call" in types
        assert "tool_result" in types
        assert types[-1] == "terminated"
        assert events[-1][1]["reason"] == "completed"
