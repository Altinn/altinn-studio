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
    def __init__(self, listing=None, prompts=None):
        self._listing = listing or [_page([])]
        self._prompts = prompts or {}
        self.published = []
        self.pages_read = 0

    def _get(self, path, **params):
        if path == "/api/public/v2/prompts":
            self.pages_read += 1
            return self._listing[params["page"] - 1]
        name = path.rsplit("/", 1)[-1]
        if name not in self._prompts:
            raise httpx.HTTPStatusError(
                "not found",
                request=httpx.Request("GET", path),
                response=httpx.Response(404),
            )
        return {"prompt": self._prompts[name], "version": 1}

    def _post(self, path, body):
        self.published.append(body["name"])
        return {"version": 2, "labels": body["labels"]}


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

        assert api.published == [LOCAL]

    def test_a_named_push_publishes_that_prompt(self, monkeypatch):
        monkeypatch.setenv(sync_prompts.PUSH_OVERRIDE_VARIABLE, "1")
        api = _Langfuse()

        _run(monkeypatch, api, ["--push", LOCAL], names=[LOCAL])

        assert api.published == [LOCAL]


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
