"""The gate datasets: loadable, discriminating, and run through what production calls."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from agents.services.decisions import Judgment
from benchmarks.dataset_sync import load_datasets, missing_assets, validate
from benchmarks.decisions import RUNS, DecisionTask, gate_verdict

ASSISTANT_ROOT = Path(__file__).resolve().parents[3]

# Gate datasets only; a generation dataset is covered in test_generation.
DATASETS = [d for d in load_datasets() if d.name.startswith("Gates/")]
ALL_DATASETS = list(load_datasets())
ALL_ITEMS = [(dataset, item) for dataset in DATASETS for item in dataset.items]


class TestTheFilesLoad:
    def test_every_manifest_entry_is_valid(self):
        problems = [problem for dataset in ALL_DATASETS for problem in validate(dataset)]

        assert problems == []

    @pytest.mark.parametrize("dataset", DATASETS, ids=lambda d: d.name)
    def test_a_dataset_is_not_empty(self, dataset):
        assert dataset.items

    def test_ids_are_unique_across_datasets(self):
        """Item ids are the upsert key, so a collision would overwrite a case."""
        ids = [item["id"] for d in ALL_DATASETS for item in d.items]

        assert len(ids) == len(set(ids))


class TestValidationHoldsFromAClone:
    """CI validates a checkout, so validate() may only assert what travels."""

    def test_a_missing_attachment_fails_validation(self):
        spec = next(d for d in ALL_DATASETS if d.name == "Planner/spec")
        item = {**spec.items[0], "input": {**spec.items[0]["input"], "attachments": ["not-in-the-repository.pdf"]}}

        problems = validate(spec._replace(items=[item]))

        assert any("'not-in-the-repository.pdf'" in p and "not in assets/" in p for p in problems)

    def test_each_attachment_is_made_from_the_html_file_beside_it(self):
        from benchmarks.planner import ASSETS_DIR

        spec = next(d for d in ALL_DATASETS if d.name == "Planner/spec")
        named = [n for i in spec.items for n in i["input"].get("attachments") or []]

        assert named, "the spec dataset is the one that names attachments"
        assert all((ASSETS_DIR / name).with_suffix(".html").is_file() for name in named)

    def test_a_gate_attachment_needs_no_file(self):
        """The security gate is shown filenames and opens nothing, so an injection
        payload carried in a filename has no asset behind it."""
        security = next(d for d in ALL_DATASETS if d.name == "Gates/security")
        named = [n for i in security.items for n in i["input"].get("attachments") or []]

        assert named, "the security set carries filename payloads"
        assert missing_assets(security) == []


class TestTheCasesAreDiscriminating:
    def test_paired_cases_expect_opposite_verdicts(self):
        """A pair exists to separate subject from intent. If both halves expect the
        same verdict the pair proves nothing."""
        by_id = {item["id"]: item for _, item in ALL_ITEMS}
        pairs = [
            (item, by_id[item["metadata"]["pairs_with"]]) for _, item in ALL_ITEMS if item["metadata"].get("pairs_with")
        ]

        assert pairs
        for item, partner in pairs:
            assert item["expectedOutput"] != partner["expectedOutput"], (
                f"{item['id']} and {partner['id']} expect the same thing"
            )

    def test_a_safe_request_must_also_be_relevant(self):
        """Every request meets both questions, so a safe item that is judged not
        relevant is still declined."""
        security = next(d for d in DATASETS if d.name == "Gates/security")

        for item in security.items:
            if item["expectedOutput"]["safe"]:
                assert item["expectedOutput"].get("relevance") is True, item["id"]


class TestTheItemsRunThroughProduction:
    """The task hands the raw request to judge_request, so an item tests the
    message and the questions that production sends."""

    async def test_the_task_judges_the_request_each_run(self):
        security = next(d for d in DATASETS if d.name == "Gates/security")
        item = next(i for i in security.items if i["id"] == "security-followup-long-reply-unsafe-middle")
        judge = AsyncMock(return_value=Judgment(relevant=True, safe=False, concern="secrets"))

        with patch("agents.services.decisions.gates.judge_request", new=judge):
            output = await DecisionTask(model="gpt-6-luna")(item=item)

        assert judge.await_count == RUNS
        assert judge.await_args is not None
        assert judge.await_args.args == (item["input"]["goal"], (), item["input"]["conversation"])
        assert [run["concern"] for run in output["runs"]] == ["secrets"] * RUNS

    async def test_the_task_sends_the_attachment_names(self):
        security = next(d for d in DATASETS if d.name == "Gates/security")
        item = next(i for i in security.items if i["id"] == "security-injection-via-attachment-name")
        judge = AsyncMock(return_value=Judgment(relevant=True, safe=False, concern="injection"))

        with patch("agents.services.decisions.gates.judge_request", new=judge):
            await DecisionTask(model="gpt-6-luna")(item=item)

        assert judge.await_args is not None
        assert judge.await_args.args[1] == item["input"]["attachments"]


def _runs(*judgments: Judgment) -> dict:
    return {"runs": [asdict(j) for j in judgments]}


class TestTheVerdict:
    def test_every_run_must_agree_with_the_item(self):
        good = Judgment(relevant=True, safe=True, probabilities={"relevance": 0.9})
        bad = Judgment(relevant=False, safe=True, probabilities={"relevance": 0.4})

        [passed] = gate_verdict(output=_runs(good, good, good), expected_output={"relevance": True})
        [failed] = gate_verdict(output=_runs(good, bad, good), expected_output={"relevance": True})

        assert passed.value == 1.0
        assert failed.value == 0.0
        assert "1 wrong of 3 runs" in str(failed.comment)
        assert "relevance 0.40-0.90" in str(failed.comment)

    def test_a_safe_item_is_checked_on_both_questions(self):
        not_relevant = Judgment(relevant=False, safe=True)

        [result] = gate_verdict(output=_runs(not_relevant), expected_output={"safe": True, "relevance": True})

        assert result.value == 0.0

    def test_a_gate_that_could_not_run_fails_the_item(self):
        [result] = gate_verdict(output=_runs(Judgment(failed=True)), expected_output={"safe": False})

        assert result.value == 0.0
        assert result.comment == "the gate could not run"

    def test_an_item_that_expects_nothing_is_not_scored(self):
        assert gate_verdict(output=_runs(Judgment()), expected_output={}) == []


class TestTheDatasetTabStaysLegible:
    """The dataset tab is the first thing anybody opens, so every description is
    assembled from the registry rather than written twice and left to drift."""

    def test_every_description_says_how_to_run_it(self):
        from benchmarks import registry

        for entry in registry.EVALS:
            assert "Run:" in entry.langfuse_description() or entry.status != "live"

    def test_a_live_description_states_its_size(self):
        for dataset in ALL_DATASETS:
            assert f"Items: {len(dataset.items)}," in dataset.description, dataset.name

    def test_a_retired_eval_says_so_and_why(self):
        """Nobody can tell a retired eval from a live one in the list otherwise."""
        from benchmarks import registry

        retired = [e for e in registry.EVALS if e.status != "live"]

        assert retired
        for entry in retired:
            description = entry.langfuse_description()
            assert entry.note, entry.name
            assert entry.status in description or entry.note.split(".")[0] in description

    def test_the_orphan_says_where_it_comes_from(self):
        from benchmarks import registry

        entry = registry.by_name("Redteam/indirect-injection")

        assert entry.status == "orphan"
        assert "lokkedue" in entry.langfuse_description()

    def test_a_description_names_the_behavior_it_proves(self):
        """A dataset in the Langfuse list should say what it is for, not just what it holds."""
        from benchmarks import manifest, registry

        for entry in registry.live():
            description = entry.langfuse_description(1)
            pinned = [b for b in manifest.for_eval(entry.name) if b.is_pinned]
            if pinned:
                assert "Holds:" in description, entry.name
                evaluator = pinned[0].evaluator
                assert evaluator and evaluator in description, entry.name
            else:
                assert "prove nothing" in description or "No behavior" in description, entry.name

    def test_a_description_says_where_the_items_are_edited(self):
        from benchmarks import registry

        for entry in registry.EVALS:
            description = entry.langfuse_description(1)
            expected = f"benchmarks/datasets/{entry.file}" if entry.file else "here only"
            assert expected in description, entry.name
