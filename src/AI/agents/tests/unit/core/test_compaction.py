"""Tests for char-budget compaction and per-result capping."""

from __future__ import annotations

from agents.core import (
    AssistantMessage,
    CompactionConfig,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
)
from agents.core.compaction import (
    cap_tool_result,
    compact_if_needed,
    estimate_tokens,
    message_chars,
    total_chars,
)


class TestEstimateTokens:
    def test_roundtrip_at_boundary(self):
        # Conservative heuristic: 4 chars/token, rounded up.
        assert estimate_tokens(0) == 0
        assert estimate_tokens(1) == 1
        assert estimate_tokens(4) == 1
        assert estimate_tokens(5) == 2


class TestCapToolResult:
    def test_under_cap_unchanged(self):
        assert cap_tool_result("hello", 10) == "hello"

    def test_over_cap_truncated_with_marker(self):
        big = "x" * 50
        out = cap_tool_result(big, 20)
        assert out.startswith("x" * 20)
        assert "truncated" in out
        assert "30 chars" in out


class TestMessageChars:
    def test_text_string_user_message(self):
        assert message_chars(UserMessage(content="hello")) == 5

    def test_assistant_with_blocks(self):
        msg = AssistantMessage(
            content=[
                TextBlock(text="abc"),
                ToolUseBlock(id="1", name="x", input={"a": 1}),
            ]
        )
        # 3 (text) + 1 (name 'x') + len(str({'a':1})) = 3 + 1 + 8 = 12
        assert message_chars(msg) == 3 + 1 + len(str({"a": 1}))

    def test_tool_result_block(self):
        msg = UserMessage(
            content=[ToolResultBlock(tool_use_id="1", content="result-text")]
        )
        assert message_chars(msg) == len("result-text")


class TestCompactIfNeeded:
    def _make_history(self, n_pairs: int, body_chars: int) -> list:
        """n_pairs of (assistant tool_use + user tool_result) after an initial user goal."""
        msgs: list = [UserMessage(content="goal")]
        for i in range(n_pairs):
            msgs.append(
                AssistantMessage(
                    content=[ToolUseBlock(id=f"id{i}", name="echo", input={"text": "q"})]
                )
            )
            msgs.append(
                UserMessage(
                    content=[ToolResultBlock(tool_use_id=f"id{i}", content="x" * body_chars)]
                )
            )
        return msgs

    def test_under_threshold_returns_input_unchanged(self):
        msgs = self._make_history(n_pairs=2, body_chars=10)
        config = CompactionConfig(compact_threshold_chars=10_000)
        out = compact_if_needed(msgs, config)
        assert out is msgs

    def test_over_threshold_collapses_middle(self):
        # 20 pairs * (~10 + 1k) chars > 5_000 threshold easily.
        msgs = self._make_history(n_pairs=20, body_chars=1000)
        config = CompactionConfig(
            compact_threshold_chars=5_000,
            keep_recent_messages=6,
        )
        out = compact_if_needed(msgs, config)

        # head + digest + 6 recent = 8 messages
        assert len(out) == 1 + 1 + 6
        assert out[0] is msgs[0]  # original user goal preserved
        # Tail is the last 6 verbatim
        assert out[-6:] == msgs[-6:]
        # Digest is a UserMessage with text content summarizing the middle.
        assert isinstance(out[1], UserMessage)
        assert isinstance(out[1].content, str)
        assert "compacted" in out[1].content

    def test_skips_compaction_when_too_short_to_help(self):
        # Even past the threshold, if there's nothing in the middle, return as-is.
        msgs = self._make_history(n_pairs=2, body_chars=10000)
        config = CompactionConfig(
            compact_threshold_chars=100,
            keep_recent_messages=6,
        )
        out = compact_if_needed(msgs, config)
        # 1 (head) + 4 (2 pairs) = 5 messages, ≤ keep_recent + 1 → no compaction
        assert out is msgs


class TestTotalChars:
    def test_sums_messages(self):
        msgs = [
            UserMessage(content="a" * 10),
            UserMessage(content="b" * 20),
        ]
        assert total_chars(msgs) == 30
