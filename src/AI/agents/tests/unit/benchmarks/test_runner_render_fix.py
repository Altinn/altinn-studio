"""Tests for the runner's render-fix loop: the pure parts (gating, fix
goal, after-fix scores). The agent round-trip itself is exercised
manually against the local stack."""

from __future__ import annotations

from benchmarks.preview_check import PageRenderResult
from benchmarks.runner import _after_fix_scores, _is_render_fix_enabled, _render_fix_goal

FAILURES = [
    PageRenderResult("Side3", False, "error page: 500"),
    PageRenderResult("Side5", False, "no render marker: Timeout 30000ms exceeded"),
]


class TestRenderFixEnabled:
    def test_disabled_by_default(self, monkeypatch):
        monkeypatch.delenv("BENCH_RENDER_FIX", raising=False)
        assert not _is_render_fix_enabled()

    def test_enabled_with_one(self, monkeypatch):
        monkeypatch.setenv("BENCH_RENDER_FIX", "1")
        assert _is_render_fix_enabled()


class TestRenderFixGoal:
    def test_names_every_failing_page_with_its_detail(self):
        goal = _render_fix_goal(FAILURES)
        assert "- Side3: error page: 500" in goal
        assert "- Side5: no render marker: Timeout 30000ms exceeded" in goal

    def test_instructs_to_fix_verify_and_commit(self):
        goal = _render_fix_goal(FAILURES)
        assert "renders without errors" in goal
        assert "commit" in goal


class TestAfterFixScores:
    def test_all_fixed_scores_full_fraction(self):
        results = [PageRenderResult("Side1", True), PageRenderResult("Side3", True)]
        scores = {s.name: s for s in _after_fix_scores(results, rounds=1)}
        assert scores["bench_render_fix_rounds"].value == 1.0
        assert scores["bench_pages_render_after_fix"].value == 1.0
        assert "2/2 pages rendered after fix" in scores["bench_pages_render_after_fix"].comment

    def test_remaining_failure_named_in_comment(self):
        results = [PageRenderResult("Side1", True), PageRenderResult("Side3", False, "error page: 500")]
        scores = {s.name: s for s in _after_fix_scores(results, rounds=2)}
        assert scores["bench_render_fix_rounds"].value == 2.0
        assert scores["bench_pages_render_after_fix"].value == 0.5
        assert "Side3: error page: 500" in scores["bench_pages_render_after_fix"].comment

    def test_recheck_unavailable_posts_only_rounds(self):
        scores = _after_fix_scores(None, rounds=1)
        assert [s.name for s in scores] == ["bench_render_fix_rounds"]
