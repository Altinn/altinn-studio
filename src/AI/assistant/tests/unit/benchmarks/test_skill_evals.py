"""The Skills/* evals: items that read the skills from this checkout, the evaluators they use, and a dataset that
covers every skill and every version file."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from agents.core.messages import AssistantMessage, ToolResultBlock, ToolUseBlock
from agents.core.skills import discover_skills
from benchmarks import check, manifest, registry
from benchmarks.generation import (
    GeneratedTurn,
    GenerationTask,
    content_patterns,
    conversation_from_item,
    required_calls,
    resolve_system_prompt,
    rule_of,
    tool_catalog,
)
from benchmarks.report import BehaviorView
from benchmarks.runstore import BehaviorResult, ItemResult

from .conftest import comment_of

SKILLS = {skill.name: skill for skill in discover_skills()}
DATASETS = registry.DATASETS_DIR


def _output(*calls, text=""):
    return GeneratedTurn(
        tool_calls=[{"name": name, "input": args} for name, args in calls], text=text, stop_reason="tool_use"
    ).as_output()


def _loaded(skill: str, *, version: str = "v9", **extra) -> dict:
    return {
        "app_version": version,
        **extra,
        "conversation": [
            {"role": "user", "text": "g"},
            {"role": "assistant", "tool_calls": [{"id": "c1", "name": "skill", "input": {"skill": skill}}]},
            {"role": "user", "tool_results": [{"tool_use_id": "c1", "live": True}]},
        ],
    }


def _last_result(item_input: dict) -> str:
    """The text of the last tool result in the item's conversation."""
    message = conversation_from_item(item_input)[-1]
    assert isinstance(message.content, list)
    block = message.content[0]
    assert isinstance(block, ToolResultBlock)
    return block.content


def _items(file: str) -> list[dict]:
    return [json.loads(line) for line in (DATASETS / file).read_text(encoding="utf-8").splitlines() if line.strip()]


class TestLiveSkillResults:
    """An item that carried skill text would measure the skill as it was when the item was written."""

    def test_a_live_result_is_the_skill_with_the_file_for_the_items_version(self):
        policy = SKILLS["studio-policy"]

        content = _last_result(_loaded("studio-policy"))

        assert content == policy.load_body("v9")
        assert (policy.path.parent / "references" / "v9.md").read_text(encoding="utf-8").strip()[:60] in content

    def test_an_on_demand_item_shows_the_skill_without_its_version_file(self):
        item_input = _loaded("studio-policy", version_file="on demand")

        content = _last_result(item_input)

        assert content == SKILLS["studio-policy"].load_body("v9", append_version_file=False)

    def test_a_live_result_can_load_a_file_the_skill_links(self):
        item_input = _loaded("studio-process")
        item_input["conversation"][1]["tool_calls"][0]["input"]["file"] = "references/task-types.md"

        content = _last_result(item_input)

        assert content == SKILLS["studio-process"].load_file("references/task-types.md")

    def test_only_a_tool_without_side_effects_can_be_live(self):
        item_input = _loaded("studio-policy")
        item_input["conversation"][1]["tool_calls"][0] = {"id": "c1", "name": "read_file", "input": {"path": "a"}}

        with pytest.raises(ValueError, match="answers a call to skill"):
            conversation_from_item(item_input)

    def test_a_skill_that_does_not_exist_fails_loudly(self):
        with pytest.raises(ValueError, match="not a skill"):
            conversation_from_item(_loaded("altinn-policy"))


class TestThePromptAnItemRunsWith:
    def test_a_goal_gets_the_skill_listing_and_the_items_app_version(self):
        prompt = resolve_system_prompt({"goal": "endre policyen", "app_version": "v9"})

        assert "studio-policy" in prompt
        assert "App version: v9" in prompt

    def test_without_an_app_version_the_item_is_for_a_v8_app(self):
        assert "App version: v8" in resolve_system_prompt({"goal": "g"})

    def test_an_unknown_app_version_fails_loudly(self):
        with pytest.raises(ValueError, match="unknown app_version"):
            resolve_system_prompt({"goal": "g", "app_version": "v10"})

    def test_the_skill_tool_lists_the_skills(self):
        """The catalog once offered a skill tool with no skills, so a replay could load nothing."""
        skill_tool = next(schema for schema in tool_catalog() if schema["name"] == "skill")

        assert "studio-policy" in skill_tool["description"]


class TestAnOnDemandItem:
    @pytest.fixture
    def model(self, monkeypatch):
        from benchmarks import generation

        calls = []

        class Fake:
            model = "fake-model"

            async def chat(self, **_):
                calls.append(1)
                return AssistantMessage(content=[ToolUseBlock(id="t", name="skill", input={"skill": "x"})])

        monkeypatch.setattr(generation, "build_adapter", lambda role, **k: Fake())
        return calls

    @pytest.mark.asyncio
    async def test_it_does_not_run_while_the_tool_appends_the_version_file(self, model, monkeypatch):
        from benchmarks import generation

        monkeypatch.setattr(generation, "_appends_version_file", lambda: True)
        expected = {"rule": {"required_calls": [{"name": "skill", "input": {"skill": "studio-policy"}}]}}

        output = await GenerationTask()(
            item={"input": {"goal": "g", **_loaded("studio-policy", version_file="on demand")}}
        )

        assert model == []
        assert rule_of(expected, output) == {}
        assert required_calls(output=output, expected_output=expected) == []

    @pytest.mark.asyncio
    async def test_it_runs_when_the_model_loads_the_version_file(self, model, monkeypatch):
        from benchmarks import generation

        monkeypatch.setattr(generation, "_appends_version_file", lambda: False)

        await GenerationTask()(item={"input": {"goal": "g", **_loaded("studio-policy", version_file="on demand")}})

        assert model == [1]


class TestRequiredCalls:
    EXPECTED = {"rule": {"required_calls": [{"name": "skill", "input": {"skill": "studio-policy"}}]}}

    def test_the_call_anywhere_in_the_turn_scores_one(self):
        output = _output(("read_file", {"path": "a"}), ("skill", {"skill": "studio-policy"}))

        [scored] = required_calls(output=output, expected_output=self.EXPECTED)

        assert scored.value == 1.0

    def test_an_alias_counts_as_the_field(self):
        """The skill tool accepts `name` for `skill`, so a model that uses it loaded the skill."""
        [scored] = required_calls(output=_output(("skill", {"name": "studio-policy"})), expected_output=self.EXPECTED)

        assert scored.value == 1.0

    def test_another_skill_misses_and_says_which(self):
        [scored] = required_calls(output=_output(("skill", {"skill": "studio-layouts"})), expected_output=self.EXPECTED)

        assert scored.value == 0.0
        assert "studio-layouts" in comment_of(scored)
        assert "missing skill" in comment_of(scored)

    def test_inputs_the_item_does_not_name_are_free(self):
        expected = {"rule": {"required_calls": [{"name": "skill", "input": {"file": "references/v9.md"}}]}}
        output = _output(("skill", {"skill": "studio-policy", "file": "references/v9.md"}))

        [scored] = required_calls(output=output, expected_output=expected)

        assert scored.value == 1.0


class TestContentPatterns:
    PATH = "App/config/authorization/policy.xml"

    def _expected(self, **target):
        return {"rule": {"content_patterns": [target]}}

    def test_an_edit_is_read_from_its_new_string(self):
        output = _output(
            ("edit_file", {"path": self.PATH, "old_string": "x", "new_string": "urn:altinn:accesspackage"})
        )

        [scored] = content_patterns(
            output=output, expected_output=self._expected(path=self.PATH, matches=["accesspackage"])
        )

        assert scored.value == 1.0

    def test_a_forbidden_pattern_in_the_write_costs_its_share(self):
        output = _output(("write_file", {"path": self.PATH, "content": "urn:altinn:rolecode:regna"}))
        expected = self._expected(path=self.PATH, matches=["rolecode"], absent=["regna"])

        [scored] = content_patterns(output=output, expected_output=expected)

        assert scored.value == 0.5
        assert "has /regna/" in comment_of(scored)

    def test_a_file_the_turn_did_not_write_fails_every_pattern(self):
        """Otherwise a turn that writes nothing would pass every `absent` pattern."""
        output = _output(("read_file", {"path": self.PATH}))
        expected = self._expected(path=self.PATH, matches=["a"], absent=["b"])

        [scored] = content_patterns(output=output, expected_output=expected)

        assert scored.value == 0.0
        assert "nothing in" in comment_of(scored)

    def test_a_target_with_only_forbidden_patterns_holds_when_the_turn_leaves_it_alone(self):
        """Such a target says what not to touch, such as a generated file."""
        output = _output(("write_file", {"path": self.PATH, "content": "a"}))
        expected = {
            "rule": {
                "content_patterns": [
                    {"path": self.PATH, "matches": ["a"]},
                    {"path": "App/models/model.cs", "absent": ["."]},
                ]
            }
        }

        [scored] = content_patterns(output=output, expected_output=expected)

        assert scored.value == 1.0

    def test_a_call_and_the_answer_can_be_targets(self):
        output = _output(("web_fetch", {"url": "https://docs.altinn.studio/nb/llms.txt"}), text="Se dokumentasjonen.")
        expected = {
            "rule": {
                "content_patterns": [
                    {"call": "web_fetch", "matches": [r"llms\.txt"]},
                    {"answer": True, "matches": ["dokumentasjonen"]},
                ]
            }
        }

        [scored] = content_patterns(output=output, expected_output=expected)

        assert scored.value == 1.0


class TestTheSkillDatasets:
    """Every skill and every version file has items, so a new skill fails here until the bench can measure it."""

    ROUTING = _items("skills_routing.jsonl")
    APPLIED = _items("skills_applied.jsonl")

    @staticmethod
    def _loads(item: dict) -> set[str]:
        return {
            call["input"].get("skill")
            for call in rule_of(item["expectedOutput"]).get("required_calls") or []
            if call["name"] == "skill"
        }

    def test_every_item_names_a_skill_that_exists(self):
        for item in self.ROUTING + self.APPLIED:
            assert item["metadata"].get("skill") in SKILLS, item["id"]
            assert item["input"].get("app_version") in ("v8", "v9"), item["id"]

    def test_every_skill_has_three_requests_that_should_load_it(self):
        for name in SKILLS:
            expecting = [
                item for item in self.ROUTING if not item["input"].get("version_file") and self._loads(item) == {name}
            ]
            assert len(expecting) >= 3, f"{name} has {len(expecting)} routing items, and needs 3"

    def test_a_routing_item_expects_the_skill_its_metadata_names(self):
        """The report splits the score by `metadata.skill`, so a mismatch credits the wrong skill."""
        for item in self.ROUTING:
            assert self._loads(item) == {item["metadata"]["skill"]}, item["id"]

    def test_every_versioned_skill_has_an_item_that_loads_its_version_file(self):
        for name, skill in SKILLS.items():
            if not (skill.path.parent / "references" / "v8.md").is_file():
                continue
            files = [
                call["input"].get("file")
                for item in self.ROUTING
                if item["input"].get("version_file") == "on demand" and item["metadata"]["skill"] == name
                for call in rule_of(item["expectedOutput"])["required_calls"]
            ]
            assert any(file in ("references/v8.md", "references/v9.md") for file in files), name

    def test_every_version_file_has_an_applied_item(self):
        for name, skill in SKILLS.items():
            versions = {item["input"]["app_version"] for item in self.APPLIED if item["metadata"]["skill"] == name}
            needed = {
                version for version in ("v8", "v9") if (skill.path.parent / "references" / f"{version}.md").is_file()
            }
            assert versions and needed <= versions, f"{name} has applied items for {sorted(versions)}"

    def test_an_applied_item_loads_the_skill_its_metadata_names(self):
        for item in self.APPLIED:
            live = {
                call["input"].get("skill")
                for entry in item["input"]["conversation"]
                if entry.get("role") == "assistant"
                for call in entry.get("tool_calls") or []
                if call["name"] == "skill"
            }
            assert item["metadata"]["skill"] in live, item["id"]

    def test_every_applied_item_is_scored_by_its_behavior(self):
        assert manifest.by_id("actor.applies-the-skill").evaluator == "gen_content_patterns"
        for item in self.APPLIED:
            assert rule_of(item["expectedOutput"]).get("content_patterns"), item["id"]

    def test_the_patterns_reject_the_mistake_each_item_names(self):
        """A pattern that is too loose passes the mistake. The canonical answer in `expectedOutput` is the correct
        change, and `test_generation` checks that the patterns accept it."""
        mistakes = json.loads((DATASETS / "skills_applied.mistakes.json").read_text(encoding="utf-8"))
        assert set(mistakes) == {item["id"] for item in self.APPLIED}
        for item in self.APPLIED:
            [scored] = content_patterns(output=mistakes[item["id"]], expected_output=item["expectedOutput"])
            assert isinstance(scored.value, float) and scored.value < 1.0, (
                f"{item['id']}: the patterns pass the mistake"
            )

    def test_every_live_result_resolves(self):
        for item in self.ROUTING + self.APPLIED:
            conversation_from_item(item["input"])


class TestReadingItBySkill:
    def test_the_report_splits_the_score_by_skill_however_many_there_are(self):
        """The usual split stops at four classes, and a mean over sixteen skills hides the one at zero."""
        behavior = manifest.by_id("actor.loads-the-relevant-skill")
        items = tuple(
            ItemResult(
                item_id=f"{name}-{n}",
                scores={"gen_required_calls": float(name != "studio-policy")},
                meta={"skill": name},
            )
            for name in SKILLS
            for n in range(2)
        )
        view = BehaviorView(
            behavior=behavior,
            baseline=None,
            previous=None,
            current=None,
            verdict="new",
            items=(),
            evidence=(),
            result=BehaviorResult(behavior.id, "gen_required_calls", None, items),
        )

        [split, *_] = view.breakdowns()

        assert split.dimension == "skill"
        assert split.declared
        assert len(split.splits) == len(SKILLS)
        assert split.weakest.value == "studio-policy"

    def test_a_run_of_some_skills_cannot_be_compared_with_a_full_run(self):
        def run_eval(entry):
            item = SimpleNamespace(id="a", metadata={"skill": "studio-policy"}, input=None, expected_output=None)
            result = SimpleNamespace(item_results=[SimpleNamespace(item=item, evaluations=[], output=None, error=None)])
            return result, {}, "v1"

        run = check.run(label="t", only=check.evals_split_by("skill"), run_eval=run_eval, skills=("studio-policy",))

        assert set(check.evals_split_by("skill")) == {"Skills/routing", "Skills/applied"}
        assert run.provenance.dataset is not None
        assert run.provenance.dataset.endswith("for studio-policy")
