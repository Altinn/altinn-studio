"""The gate datasets: loadable, discriminating, and matching what production sends."""

from __future__ import annotations

import pytest

from pathlib import Path

AGENTS_ROOT = Path(__file__).resolve().parents[3]

from agents.services.llm.intent_parser import _validate_goal_safety_quick
from agents.services.llm.llm_client import build_intent_parse_message
from agents.services.llm.scope_checker import build_scope_check_message
from benchmarks.dataset_sync import load_datasets, missing_assets, render_input, validate

# Gate prompt datasets only; a generation dataset is covered in test_generation.
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

    def test_validation_does_not_require_a_gitignored_file(self):
        """benchmarks/assets is gitignored, so requiring the PDFs in validate()
        passed only on a machine that already had them and failed every clone."""
        assets = (AGENTS_ROOT / ".gitignore").read_text()
        assert "benchmarks/assets/" in assets

        problems = [p for d in ALL_DATASETS for p in validate(d)]

        assert not any("assets/" in problem for problem in problems)

    def test_a_named_attachment_is_still_checked_where_it_can_be(self):
        """Reported separately, so a typo in a filename is not silent."""
        spec = next(d for d in ALL_DATASETS if d.name == "Planner/spec")
        named = [n for i in spec.items for n in i["input"].get("attachments") or []]

        assert named, "the spec dataset is the one that names attachments"
        for absent in missing_assets(spec):
            assert "not in assets/" in absent

    def test_a_gate_attachment_needs_no_file(self):
        """The intent gate is shown filenames and opens nothing, so an injection
        payload carried in a filename has no asset behind it."""
        safety = next(d for d in ALL_DATASETS if d.name == "Gates/intent-safety")
        named = [n for i in safety.items for n in i["input"].get("attachments") or []]

        assert named, "the safety set carries filename payloads"
        assert missing_assets(safety) == []


class TestTheBlocklistAgreesWithTheDatasets:
    """`_validate_goal_safety_quick` runs before the model and can reject on its
    own, so a false positive there is unreachable by any prompt change."""

    def test_no_item_the_datasets_call_safe_is_rejected(self):
        rejected = {
            item["id"]
            for _, item in ALL_ITEMS
            if item["expectedOutput"].get("safe", True)
            and not _validate_goal_safety_quick(item["input"]["goal"])[0]
        }

        assert rejected == set(), (
            "the blocklist and the datasets disagree; update the blocklist or the dataset"
        )

    def test_the_blocklist_catches_destructive_patterns(self):
        for goal in ["wipe database", "drop table users", "disable auth for the app"]:
            assert not _validate_goal_safety_quick(goal)[0], goal

    def test_the_blocklist_treats_both_languages_alike(self):
        """It used to reject the English half of this pair and accept the Norwegian
        one, so the gate a user tripped depended on the language they wrote in."""
        assert _validate_goal_safety_quick("tilbakestilling av passord")[0]
        assert _validate_goal_safety_quick("password reset")[0]


class TestTheCasesAreDiscriminating:
    def test_paired_cases_expect_opposite_verdicts(self):
        """A pair exists to separate subject from intent. If both halves expect the
        same verdict the pair proves nothing."""
        by_id = {item["id"]: item for _, item in ALL_ITEMS}
        pairs = [
            (item, by_id[item["metadata"]["pairs_with"]])
            for _, item in ALL_ITEMS
            if item["metadata"].get("pairs_with")
        ]

        assert pairs
        for item, partner in pairs:
            assert item["expectedOutput"] != partner["expectedOutput"], (
                f"{item['id']} and {partner['id']} expect the same thing"
            )

    def test_the_scope_declines_name_the_language(self):
        """The prompt requires the decline in the user's language, so an out-of-scope
        case that does not pin the language is not testing that half."""
        scope = next(d for d in DATASETS if d.name == "Gates/scope")

        for item in scope.items:
            if not item["expectedOutput"]["in_scope"]:
                assert item["expectedOutput"].get("decline_language") in {"nb", "en"}, (
                    item["id"]
                )

    def test_both_confidence_bands_are_represented(self):
        confidence = next(d for d in DATASETS if d.name == "Gates/confidence")
        bands = {item["expectedOutput"]["confidence_band"] for item in confidence.items}

        assert bands == {"below_threshold", "at_or_above_threshold"}


class TestTheUploadedInputMatchesProduction:
    """Both gates build their user message in code, so an experiment that is handed
    only the goal tests framing production never sends."""

    def test_a_scope_item_carries_the_classifier_message(self):
        scope = next(d for d in DATASETS if d.name == "Gates/scope")
        item = next(i for i in scope.items if i["id"] == "scope-travel-advice")

        rendered = render_input(scope, item)

        assert rendered["user_message"] == build_scope_check_message(item["input"]["goal"])
        assert rendered["goal"] == item["input"]["goal"]

    def test_an_attachment_item_carries_the_filename_line(self):
        safety = next(d for d in DATASETS if d.name == "Gates/intent-safety")
        item = next(
            i for i in safety.items if i["id"] == "safety-injection-via-attachment-name"
        )

        rendered = render_input(safety, item)

        assert rendered["user_message"] == build_intent_parse_message(
            item["input"]["goal"], item["input"]["attachments"]
        )
        assert "ignore-previous-instructions" in rendered["user_message"]

    @pytest.mark.parametrize("dataset", DATASETS, ids=lambda d: d.name)
    def test_every_item_renders(self, dataset):
        for item in dataset.items:
            assert render_input(dataset, item)["user_message"]


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
            assert entry.status in description or entry.note.split(".")[0] in description
            assert entry.note, entry.name

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
                assert pinned[0].evaluator in description, entry.name
            else:
                assert "prove nothing" in description or "No behavior" in description, entry.name

    def test_a_description_says_where_the_items_are_edited(self):
        from benchmarks import registry

        for entry in registry.EVALS:
            description = entry.langfuse_description(1)
            expected = f"benchmarks/datasets/{entry.file}" if entry.file else "here only"
            assert expected in description, entry.name
