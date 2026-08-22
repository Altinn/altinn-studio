"""A component that cannot render throws, app-frontend catches it, and the
page still reports itself loaded with nothing marking the DOM. The console
is the only signal, so it decides whether a page counts as rendered."""

from __future__ import annotations

import pytest

from agents.services.preview.render_check import _is_thrown_error

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
