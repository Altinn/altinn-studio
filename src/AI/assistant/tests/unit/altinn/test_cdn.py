"""The schemas that fetch_cdn_schema accepts from altinncdn.no."""

from __future__ import annotations

from collections.abc import Callable

import httpx
import pytest

from agents.altinn import cdn

_SCHEMA_URL = "https://altinncdn.no/schemas/json/text-resources/text-resources.schema.v1.json"
_SCHEMA = {"$id": _SCHEMA_URL}

Handler = Callable[[httpx.Request], httpx.Response]


@pytest.fixture
def serve(monkeypatch: pytest.MonkeyPatch) -> Callable[[Handler], None]:
    """Send the requests of fetch_cdn_schema to a handler. The client gets the same options."""

    def use_handler(handler: Handler) -> None:
        def get(url: str, **options) -> httpx.Response:
            with httpx.Client(transport=httpx.MockTransport(handler), **options) as client:
                return client.get(url)

        monkeypatch.setattr(cdn.httpx, "get", get)

    return use_handler


def _redirect_to(location: str) -> httpx.Response:
    return httpx.Response(302, headers={"Location": location})


def test_follows_a_redirect_that_stays_on_altinncdn(serve):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url == _SCHEMA_URL:
            return httpx.Response(200, json=_SCHEMA)
        return _redirect_to(_SCHEMA_URL)

    serve(handler)

    assert cdn.fetch_cdn_schema("https://altinncdn.no/old/schema.json") == _SCHEMA


@pytest.mark.parametrize(
    ("location", "error"),
    [
        ("https://example.com/schema.json", "INVALID_DOMAIN"),
        ("http://altinncdn.no/schema.json", "INVALID_PROTOCOL"),
    ],
)
def test_rejects_a_redirect_away_from_altinncdn_over_https(serve, location: str, error: str):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url == _SCHEMA_URL:
            return _redirect_to(location)
        return httpx.Response(200, json=_SCHEMA)

    serve(handler)

    with pytest.raises(ValueError, match=error):
        cdn.fetch_cdn_schema(_SCHEMA_URL)


def test_rejects_another_host_before_it_sends_a_request(serve):
    sent: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return httpx.Response(200, json=_SCHEMA)

    serve(handler)

    with pytest.raises(ValueError, match="INVALID_DOMAIN"):
        cdn.fetch_cdn_schema("https://example.com/schema.json")
    assert sent == []


def test_raises_for_an_error_status(serve):
    serve(lambda request: httpx.Response(404))

    with pytest.raises(httpx.HTTPStatusError):
        cdn.fetch_cdn_schema(_SCHEMA_URL)
