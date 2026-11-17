import time

from shared.utils.ttl_cache import TtlCache


def test_returns_a_value_until_it_expires(monkeypatch):
    now = 1_000.0
    monkeypatch.setattr(time, "monotonic", lambda: now)
    cache: TtlCache[str] = TtlCache(ttl_seconds=60)
    cache.put("key", "value")

    now += 59
    assert cache.get("key") == "value"
    now += 1
    assert cache.get("key") is None


def test_has_nothing_for_a_key_it_was_not_given():
    assert TtlCache[str](ttl_seconds=60).get("key") is None
