"""Langfuse serves the prompts, so drift and unreviewed publishing are both hazards."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import httpx
import pytest

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "sync_prompts.py"
_spec = importlib.util.spec_from_file_location("sync_prompts", SCRIPT)
sync_prompts = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sync_prompts)

RETIRED = "assistant_response_generation"
LOCAL = "goal_suggestions"
IN_SYNC = "scope_check"
LOCAL_TEMPLATE = "intake_planning_user"
LOCAL_JUDGE = "intent_match"


def _page(names, *, total_pages=1, labels=None):
    labels = labels or {}
    return {
        "data": [{"name": name, "labels": labels.get(name, [])} for name in names],
        "meta": {"totalPages": total_pages},
    }


class _Langfuse:
    def __init__(self, listing=None, prompts=None, published=None):
        self._listing = listing or [_page([])]
        self._prompts = prompts or {}
        self._published = published or {}
        self.published = []
        self.patched = []
        self.pages_read = 0
        self.get_error = None

    def _get(self, path, **params):
        if self.get_error is not None:
            raise self.get_error
        if path == "/api/public/v2/prompts":
            self.pages_read += 1
            return self._listing[params["page"] - 1]
        name = path.rsplit("/", 1)[-1]
        if name in self._published:
            return self._published[name]
        if name not in self._prompts:
            raise httpx.HTTPStatusError(
                "not found",
                request=httpx.Request("GET", path),
                response=httpx.Response(404),
            )
        return {"prompt": self._prompts[name], "version": 1}

    def _post(self, path, body):
        self.published.append(body)
        return {"version": 2, "labels": body["labels"]}

    def _patch(self, path, body):
        self.patched.append((path, body))
        return {"version": int(path.rsplit("/", 1)[-1]), "labels": body["newLabels"]}


class TestPromptsLangfuseHoldsAlone:
    def test_a_prompt_with_no_repo_file_is_reported(self, capsys):
        api = _Langfuse([_page([RETIRED], labels={RETIRED: ["latest", "production"]})])

        assert sync_prompts._report_orphans(api) == [RETIRED]
        assert (
            f"{RETIRED}: in Langfuse (latest, production) with no repo file"
            in capsys.readouterr().out
        )

    def test_a_prompt_with_a_repo_file_is_not_reported(self, capsys):
        api = _Langfuse([_page([LOCAL])])

        assert sync_prompts._report_orphans(api) == []
        assert LOCAL not in capsys.readouterr().out

    @pytest.mark.parametrize("name", [LOCAL_TEMPLATE, LOCAL_JUDGE])
    def test_a_prompt_from_a_subdirectory_is_not_orphaned(self, name):
        """Templates and judges are published by name too, from below the prompts root."""
        assert sync_prompts._report_orphans(_Langfuse([_page([name])])) == []

    def test_a_prompt_served_from_a_differently_named_file_is_not_orphaned(self):
        """The intent gate loads Langfuse `intent_check` from `intent_security.md`, so
        matching on filename alone told you to archive a prompt in active use."""
        assert sync_prompts._report_orphans(_Langfuse([_page(["intent_check"])])) == []

    def test_labels_are_named_even_when_there_are_none(self, capsys):
        api = _Langfuse([_page([RETIRED])])

        sync_prompts._report_orphans(api)

        assert f"{RETIRED}: in Langfuse (no labels)" in capsys.readouterr().out

    def test_every_page_of_the_listing_is_read(self):
        api = _Langfuse([_page([LOCAL], total_pages=2), _page([RETIRED], total_pages=2)])

        assert sync_prompts._report_orphans(api) == [RETIRED]
        assert api.pages_read == 2

    def test_a_full_diff_reports_them(self, capsys, monkeypatch):
        api = _Langfuse([_page([RETIRED])], prompts={LOCAL: "whatever"})
        _run(monkeypatch, api, ["--diff"], names=[LOCAL])

        assert f"{RETIRED}: in Langfuse" in capsys.readouterr().out


class TestPublishingIsGated:
    def test_a_push_without_the_override_is_refused(self, monkeypatch):
        monkeypatch.delenv(sync_prompts.PUSH_OVERRIDE_VARIABLE, raising=False)

        with pytest.raises(SystemExit, match="publish from CI"):
            sync_prompts._require_push_override()

    def test_the_override_allows_a_push(self, monkeypatch):
        monkeypatch.setenv(sync_prompts.PUSH_OVERRIDE_VARIABLE, "1")

        sync_prompts._require_push_override()

    def test_a_gated_push_publishes_nothing(self, monkeypatch):
        monkeypatch.delenv(sync_prompts.PUSH_OVERRIDE_VARIABLE, raising=False)
        api = _Langfuse(prompts={LOCAL: "old"})

        with pytest.raises(SystemExit):
            _run(monkeypatch, api, ["--push"], names=[LOCAL])

        assert api.published == []


class TestPushingEveryDriftedPrompt:
    def test_only_the_drifted_prompts_are_published(self, monkeypatch):
        monkeypatch.setenv(sync_prompts.PUSH_OVERRIDE_VARIABLE, "1")
        api = _Langfuse(prompts={LOCAL: "old", IN_SYNC: _content(IN_SYNC)})

        _run(monkeypatch, api, ["--push"], names=[LOCAL, IN_SYNC])

        assert [b["name"] for b in api.published] == [LOCAL]

    def test_a_named_push_publishes_that_prompt(self, monkeypatch):
        monkeypatch.setenv(sync_prompts.PUSH_OVERRIDE_VARIABLE, "1")
        api = _Langfuse()

        _run(monkeypatch, api, ["--push", LOCAL], names=[LOCAL])

        assert [b["name"] for b in api.published] == [LOCAL]


def _content(name):
    return sync_prompts.load_prompt(name)["content"]


def _run(monkeypatch, api, argv, names):
    monkeypatch.setattr(sync_prompts, "LangfuseApi", lambda: api)
    monkeypatch.setattr(sync_prompts, "load_dotenv", lambda *args, **kwargs: None)
    monkeypatch.setattr(sync_prompts, "_local_prompt_names", lambda: names)
    monkeypatch.setattr(sys, "argv", ["sync_prompts.py", *argv])
    return sync_prompts.main()


def test_the_readme_is_not_treated_as_a_prompt():
    """`*.md` swept up the README, which was then diffed against Langfuse."""
    assert "README" not in sync_prompts._local_prompt_names()
    assert "README" not in sync_prompts._every_local_name()


@pytest.mark.parametrize("name", [LOCAL_TEMPLATE, LOCAL_JUDGE])
def test_bulk_discovery_reaches_nested_prompts(name):
    """Bulk --diff and --push globbed one level, so a change to a template or a judge
    prompt was never reported and never published."""
    assert name in sync_prompts._local_prompt_names()


class TestPromote:
    """Rolling back is the only ungated write, so its endpoint has to be right."""

    def test_it_patches_the_version_labels_endpoint(self, capsys):
        api = _Langfuse()

        sync_prompts._promote(api, IN_SYNC, 3)

        assert api.patched == [
            (f"/api/public/v2/prompts/{IN_SYNC}/versions/3", {"newLabels": ["production"]})
        ]
        assert "is now" in capsys.readouterr().out


class TestPushKeepsThePublishedShape:
    """A chat prompt's user turn carries the request; publishing it as text drops it."""

    def _chat(self, name):
        return {
            "type": "chat",
            "version": 3,
            "prompt": [
                {"type": "message", "role": "system", "content": "old system text"},
                {"type": "message", "role": "user", "content": "{{user_message}}"},
            ],
        }

    def test_a_chat_prompt_is_republished_as_chat_with_its_turns(self):
        api = _Langfuse(published={IN_SYNC: self._chat(IN_SYNC)})

        sync_prompts._push(api, IN_SYNC, "why")

        body = api.published[0]
        assert body["type"] == "chat"
        assert [turn["role"] for turn in body["prompt"]] == ["system", "user"]
        assert body["prompt"][1]["content"] == "{{user_message}}"
        assert body["prompt"][0]["content"] != "old system text"

    def test_a_text_prompt_stays_text(self):
        api = _Langfuse(published={LOCAL: {"type": "text", "version": 2, "prompt": "old"}})

        sync_prompts._push(api, LOCAL, "why")

        body = api.published[0]
        assert body["type"] == "text"
        assert isinstance(body["prompt"], str)

    def test_a_prompt_langfuse_has_never_seen_is_published_as_text(self):
        api = _Langfuse()

        sync_prompts._push(api, LOCAL, "why")

        assert api.published[0]["type"] == "text"


class TestPushRefusesToGuessTheShape:
    """A transient read failure must not republish a chat prompt as text, which
    would drop its user turn and every variable binding."""

    def _failing(self, status):
        api = _Langfuse()
        api.get_error = httpx.HTTPStatusError(
            "boom",
            request=httpx.Request("GET", "/api/public/v2/prompts/x"),
            response=httpx.Response(status),
        )
        return api

    def test_a_server_error_stops_the_publish(self):
        api = self._failing(500)

        with pytest.raises(SystemExit) as raised:
            sync_prompts._push(api, IN_SYNC, "why")

        assert "Refusing to publish" in str(raised.value)
        assert api.published == []

    def test_a_404_still_means_nobody_has_published_it(self):
        api = self._failing(404)

        sync_prompts._push(api, LOCAL, "why")

        assert api.published[0]["type"] == "text"
