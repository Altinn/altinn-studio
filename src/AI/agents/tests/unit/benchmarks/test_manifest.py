"""The manifest is a set of claims about the agent, so the claims are checked."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from benchmarks import manifest, registry

AGENTS_ROOT = Path(__file__).resolve().parents[3]


def test_every_component_resolves_to_a_symbol_that_exists():
    """Line numbers drifted silently and three pointers were already wrong, so a
    component names a symbol and this resolves it."""
    import ast

    for component in manifest.COMPONENTS:
        path, _, symbol = component.where.partition("::")
        assert symbol, f"{component.id}: {component.where} names no symbol"
        target = AGENTS_ROOT / path
        assert target.exists(), f"{component.id}: {path} does not exist"

        tree = ast.parse(target.read_text())
        outer, _, inner = symbol.partition(".")
        defined = {
            node.name: node
            for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
        }
        assert outer in defined, f"{component.id}: {path} defines no {outer!r}"
        if inner:
            members = {
                node.name
                for node in defined[outer].body
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            }
            assert inner in members, f"{component.id}: {outer} has no {inner!r}"


def test_every_pinned_behavior_names_a_live_eval():
    for behavior in manifest.pinned():
        found = registry.by_name(behavior.eval)
        assert found.status == "live", f"{behavior.id}: {behavior.eval} is {found.status}"


def test_every_live_eval_is_claimed_by_a_behavior():
    """An eval nothing claims proves nothing anyone stated."""
    assert manifest.evals_with_no_behavior() == ()


def test_gaps_declare_what_would_pin_them():
    for behavior in manifest.gaps():
        assert behavior.fix.kind == "gap"
        assert behavior.checks.lower().startswith("nothing checks"), (
            f"{behavior.id}: an unpinned behavior must not claim to check anything"
        )
        assert len(behavior.fix.acceptance) > 40, f"{behavior.id}: acceptance is too vague"


def test_judged_behaviors_record_their_judge_version():
    for behavior in manifest.judged():
        assert behavior.judge_version
        assert "judge version" in behavior.blind, (
            f"{behavior.id}: a judged score is only comparable while the judge holds, "
            "so say so in blind"
        )


def test_see_references_resolve_and_are_not_self_referential():
    for behavior in manifest.BEHAVIORS:
        for other in behavior.see:
            assert other != behavior.id, f"{behavior.id}: sees itself"
            manifest.by_id(other)


def test_prose_fields_are_written_not_stubbed():
    for behavior in manifest.BEHAVIORS:
        assert len(behavior.blind) > 60, f"{behavior.id}: blind is too short to be honest"
        assert len(behavior.fix.task) > 80, f"{behavior.id}: task is too short to act on"
        assert behavior.text[0].isupper(), f"{behavior.id}: text should read as a sentence"
        assert not behavior.text.endswith("."), f"{behavior.id}: text is a title, not a sentence"


def test_no_em_dashes_anywhere_in_the_manifest():
    source = (AGENTS_ROOT / "benchmarks" / "manifest.py").read_text()
    assert "—" not in source


def test_agent_prompt_requires_evidence():
    behavior = manifest.by_id("query.names-needed-concepts")
    with pytest.raises(AssertionError):
        behavior.agent_prompt(())


def test_agent_prompt_carries_the_evidence_it_is_given():
    behavior = manifest.by_id("query.names-needed-concepts")
    prompt = behavior.agent_prompt(("query-vedlegg fell from 1.0 to 0.5",))
    assert "query-vedlegg fell from 1.0 to 0.5" in prompt
    assert behavior.fix.acceptance in prompt
    assert behavior.blind in prompt
    assert manifest.component("query").where in prompt
    assert "build.references-resolve" in prompt


def test_agent_prompt_forbids_gaming_the_check():
    for behavior in manifest.BEHAVIORS:
        prompt = behavior.agent_prompt(("placeholder",))
        assert "Do not change an eval" in prompt


def test_every_component_has_at_least_one_behavior():
    for component in manifest.COMPONENTS:
        assert manifest.behaviors_of(component.id), component.id


def test_behavior_ids_are_kebab_case_under_their_component():
    for behavior in manifest.BEHAVIORS:
        assert re.fullmatch(r"[a-z]+\.[a-z0-9]+(-[a-z0-9]+)*", behavior.id), behavior.id


EMITTING_MODULES = ("gates", "planner", "generation", "preview_check", "evaluators", "agent_task")


def _emittable_score_names() -> set[str]:
    import importlib

    names: set[str] = set()
    for module in EMITTING_MODULES:
        names |= set(importlib.import_module(f"benchmarks.{module}").SCORE_NAMES)
    return names


def test_every_pinned_behavior_names_an_evaluator_the_code_can_emit():
    """Five behaviors once named evaluators no module emitted, and all read as holding."""
    emittable = _emittable_score_names()
    for behavior in manifest.pinned():
        assert behavior.evaluator in emittable, (
            f"{behavior.id}: no module emits a score named {behavior.evaluator!r}. "
            f"Available: {sorted(emittable)}"
        )


def test_declared_score_names_match_what_each_module_actually_emits():
    """SCORE_NAMES is a declaration, so it is checked against the source it describes."""
    import re

    for module in ("gates", "planner", "generation", "evaluators"):
        source = (AGENTS_ROOT / "benchmarks" / f"{module}.py").read_text()
        found = set(re.findall(r'name="([a-z_]+)"', source))
        declared = set(__import__(f"benchmarks.{module}", fromlist=["SCORE_NAMES"]).SCORE_NAMES)
        assert declared == found, f"{module}: declared {declared ^ found} not emitted, or vice versa"


def test_every_score_the_harness_can_post_is_declared_by_some_module():
    """A score with no SCORE_NAMES entry cannot be pinned, however useful it is."""
    from benchmarks import runner

    configured = set(runner.SCORE_CONFIG_SPECS) | set(runner.PREVIEW_SCORE_CONFIG_SPECS)
    undeclared = configured - _emittable_score_names()

    assert undeclared == set(), (
        f"{sorted(undeclared)} have Langfuse score configs but no module declares them, "
        "so no behavior can be pinned to them"
    )


def test_no_evaluator_is_named_after_a_component_or_a_property():
    """A per-property check dies the day its defect is fixed."""
    banned = ("timestamp", "datepicker", "fileupload", "optionsid", "checkbox", "radio")
    for behavior in manifest.pinned():
        assert behavior.evaluator
        lowered = behavior.evaluator.lower()
        for word in banned:
            assert word not in lowered, (
                f"{behavior.id}: evaluator {behavior.evaluator!r} names one property of one "
                "component. Make the check generic and let an item carry the specifics."
            )


def test_a_dataset_that_scores_nothing_is_not_counted_as_coverage():
    for behavior in manifest.with_a_dataset_but_no_score():
        assert not behavior.is_pinned
        assert behavior.eval
        assert behavior.fix.kind == "gap"
