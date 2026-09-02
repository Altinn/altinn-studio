"""Tests for the preview render check: the pure parts (URL handling,
score building, opt-in gating). The browser flow itself is exercised
manually against the local stack."""

from __future__ import annotations

from benchmarks.preview_check import (
    PageRenderResult,
    PreviewCheckUnavailable,
    build_scores,
    is_enabled,
    run,
    swap_layout_in_preview_url,
)

PREVIEW_URL = (
    "http://studio.localhost/app-specific-preview/ttd/test-app"
    "?selectedLayoutSet=form#/instance/51001/f1e23d45-6789-1bcd-8c34-56789abcdef0/Task_1/Side1"
)


class TestSwapLayoutInPreviewUrl:
    def test_replaces_the_selected_layout(self):
        result = swap_layout_in_preview_url(PREVIEW_URL, "Side2")
        assert result == PREVIEW_URL.replace("/Task_1/Side1", "/Task_1/Side2")

    def test_appends_layout_when_url_has_none(self):
        url_without_layout = PREVIEW_URL.rsplit("/", 1)[0]
        result = swap_layout_in_preview_url(url_without_layout, "Side2")
        assert result == url_without_layout + "/Side2"

    def test_returns_none_without_instance_fragment(self):
        stateless_url = "http://studio.localhost/app-specific-preview/ttd/test-app?selectedLayoutSet=form"
        assert swap_layout_in_preview_url(stateless_url, "Side2") is None


class TestBuildScores:
    def test_all_pages_rendering_scores_full(self):
        scores = build_scores(
            [PageRenderResult("Side1", True), PageRenderResult("Side2", True)]
        )
        by_name = {score.name: score for score in scores}
        assert by_name["bench_renders"].value == 1.0
        assert by_name["bench_pages_render"].value == 1.0
        assert "2/2" in by_name["bench_pages_render"].comment

    def test_broken_page_names_the_page_in_the_comment(self):
        scores = build_scores(
            [
                PageRenderResult("Side1", True),
                PageRenderResult("Side2", False, "error page: Ukjent feil"),
            ]
        )
        by_name = {score.name: score for score in scores}
        assert by_name["bench_renders"].value == 1.0
        assert by_name["bench_pages_render"].value == 0.5
        assert "Side2" in by_name["bench_pages_render"].comment
        assert "Ukjent feil" in by_name["bench_pages_render"].comment

    def test_first_page_failing_zeroes_bench_renders(self):
        scores = build_scores([PageRenderResult("Side1", False, "no render marker")])
        by_name = {score.name: score for score in scores}
        assert by_name["bench_renders"].value == 0.0
        assert by_name["bench_pages_render"].value == 0.0

    def test_no_pages_scores_zero_with_explanation(self):
        by_name = {score.name: score for score in build_scores([])}
        assert by_name["bench_renders"].value == 0.0
        assert by_name["bench_pages_render"].value == 0.0
        assert "no ordered pages" in by_name["bench_renders"].comment


class TestOptIn:
    def test_disabled_by_default(self, monkeypatch):
        monkeypatch.delenv("BENCH_PREVIEW_CHECK", raising=False)
        assert is_enabled() is False

    def test_enabled_with_one(self, monkeypatch):
        monkeypatch.setenv("BENCH_PREVIEW_CHECK", "1")
        assert is_enabled() is True

    def test_unavailable_infrastructure_skips_without_scores(self, monkeypatch):
        def raise_unavailable(*args):
            raise PreviewCheckUnavailable("playwright is not installed")

        monkeypatch.setattr("benchmarks.preview_check._render_results", raise_unavailable)

        assert run("altinity_session_abc123", ["Side1"]) == []
