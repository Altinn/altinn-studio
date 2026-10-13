"""The repo files are the fallback when Langfuse is unavailable, so every one has to load.

Judges and templates live in subdirectories. They were discoverable by name and not
loadable by name, so `sync_prompts --diff` crashed and the documented fallback did not
exist for seven of the thirteen prompts this repo ships.
"""

from __future__ import annotations

import pytest

from agents.prompts.loader import PROMPTS_DIR, load_prompt

SHIPPED = sorted(
    path.stem for path in PROMPTS_DIR.rglob("*.md") if path.stem != "README" and not path.name.startswith("_")
)


def test_the_repo_ships_prompts_in_subdirectories():
    """Guards the premise: a flat prompts directory would make this file pointless."""
    nested = [p for p in PROMPTS_DIR.rglob("*.md") if p.parent != PROMPTS_DIR]

    assert nested, "no nested prompts, so this test is no longer testing anything"


@pytest.mark.parametrize("name", SHIPPED)
def test_every_shipped_prompt_loads_by_name(name):
    assert load_prompt(name)["content"].strip()


def test_a_missing_prompt_still_raises():
    with pytest.raises(FileNotFoundError):
        load_prompt("no-such-prompt")


def test_two_nested_files_with_one_stem_are_ambiguous(tmp_path, monkeypatch):
    """Neither must win by sorting first."""
    monkeypatch.setattr("agents.prompts.loader.PROMPTS_DIR", tmp_path)
    for folder in ("judges", "templates"):
        (tmp_path / folder).mkdir()
        (tmp_path / folder / "same.md").write_text("x", encoding="utf-8")

    with pytest.raises(FileNotFoundError) as raised:
        load_prompt("same")

    assert "ambiguous" in str(raised.value)
    assert "judges/same.md" in str(raised.value)
    assert "templates/same.md" in str(raised.value)


def test_a_root_file_does_not_shadow_a_nested_one(tmp_path, monkeypatch):
    """Returning the root file quietly would serve one of two prompts by luck."""
    monkeypatch.setattr("agents.prompts.loader.PROMPTS_DIR", tmp_path)
    (tmp_path / "same.md").write_text("root", encoding="utf-8")
    (tmp_path / "judges").mkdir()
    (tmp_path / "judges" / "same.md").write_text("nested", encoding="utf-8")

    with pytest.raises(FileNotFoundError) as raised:
        load_prompt("same")

    assert "ambiguous" in str(raised.value)
    assert "judges/same.md" in str(raised.value)
