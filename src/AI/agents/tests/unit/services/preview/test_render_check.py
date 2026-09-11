"""A component that cannot render throws, app-frontend catches it, and the
page still reports itself loaded with nothing marking the DOM. The console
is the only signal, so it decides whether a page counts as rendered."""

from __future__ import annotations

import pytest

from importlib import import_module

render_check_module = import_module("agents.services.preview.render_check")

from agents.services.preview.render_check import (
    PageRenderResult,
    PreviewCheckUnavailable,
    _check_pages,
    read_page_order,
    _is_thrown_error,
)

THROWN = [
    "TypeError: Cannot read properties of undefined (reading 'render') "
    "at TUe (https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js:1154:2349)",
    "ReferenceError: layoutComponent is not defined",
    "Uncaught Error: element type is invalid",
    "component.render is not a function",
]

NOISE = [
    "Failed to load resource: the server responded with a status of 404 (Not Found)",
    "net::ERR_CONNECTION_REFUSED",
    "Warning: validateDOMNesting(...): <div> cannot appear as a descendant of <p>",
    "Download the React DevTools for a better development experience",
    "Refused to load the image because it violates Content Security Policy",
]


class TestThrownErrorDetection:
    @pytest.mark.parametrize("message", THROWN)
    def test_exceptions_fail_the_page(self, message):
        assert _is_thrown_error(message) is True

    @pytest.mark.parametrize("message", NOISE)
    def test_log_noise_and_failed_requests_do_not(self, message):
        assert _is_thrown_error(message) is False


class TestPartialPageValidation:
    """A preview url that cannot select layouts leaves most pages unopened.
    Scoring what did open would report a pass the run never earned."""

    def test_a_url_without_layout_selection_skips_the_check(self):
        with pytest.raises(PreviewCheckUnavailable):
            _check_pages(
                page=None,
                first_page_url="https://studio.localhost/preview/ttd/app#/nope",
                page_order=["Side1", "Side2", "Side3"],
            )

    def test_a_usable_url_checks_every_page(self, monkeypatch):
        checked: list[str] = []
        monkeypatch.setattr(
            render_check_module,
            "_check_single_page",
            lambda page, url, layout: checked.append(layout)
            or PageRenderResult(layout, True, ""),
        )

        results = _check_pages(
            page=None,
            first_page_url="https://studio.localhost/preview/ttd/app#/instance/1/2/Task_1/Side1",
            page_order=["Side1", "Side2", "Side3"],
        )

        assert checked == ["Side1", "Side2", "Side3"]
        assert len(results) == 3


class TestPageOrderShapes:
    """Settings.json is written by the agent, so a malformed one must skip the
    file rather than take down the render check."""

    def _write(self, tmp_path, content: str):
        settings = tmp_path / "App" / "ui" / "layoutset" / "Settings.json"
        settings.parent.mkdir(parents=True)
        settings.write_text(content, encoding="utf-8")
        return tmp_path

    @pytest.mark.parametrize(
        "content", ["[]", '"just a string"', "5", '{"pages": [1, 2]}', '{"pages": []}']
    )
    def test_a_shape_that_is_not_an_order_is_skipped(self, tmp_path, content):
        assert read_page_order(self._write(tmp_path, content)) == []

    def test_a_valid_order_is_read(self, tmp_path):
        root = self._write(tmp_path, '{"pages": {"order": ["Side1", "Side2"]}}')

        assert read_page_order(root) == ["Side1", "Side2"]
