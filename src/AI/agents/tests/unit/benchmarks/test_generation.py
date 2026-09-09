"""Scoring what a model generates, with no model involved."""

from __future__ import annotations

import json

import pytest

from agents.core.messages import AssistantMessage, TextBlock, ToolResultBlock, ToolUseBlock
from benchmarks.generation import (
    GeneratedTurn,
    conversation_from_item,
    forbidden_tools,
    json_arguments_parse,
    message_from_item,
    stopped_cleanly,
    tool_arguments,
    tool_catalog,
    tool_choice,
    turn_from_reply,
)


def _output(*calls, text="", stop_reason="tool_use"):
    return GeneratedTurn(
        tool_calls=[{"name": n, "input": i} for n, i in calls],
        text=text,
        stop_reason=stop_reason,
    ).as_output()


class TestReplayingTheConversation:
    def test_a_user_turn_is_plain_text(self):
        message = message_from_item({"role": "user", "text": "legg til et felt"})

        assert message.content == "legg til et felt"

    def test_a_stubbed_tool_result_stands_in_for_the_real_tool(self):
        """This is the faking: the model sees what the tool would have returned,
        so a decision can be scored without a repo behind it."""
        message = message_from_item(
            {"role": "user", "tool_results": [{"tool_use_id": "t1", "content": "{}"}]}
        )

        assert isinstance(message.content[0], ToolResultBlock)
        assert message.content[0].tool_use_id == "t1"
        assert message.content[0].content == "{}"

    def test_an_error_result_can_be_stubbed_too(self):
        message = message_from_item(
            {"role": "user", "tool_results": [{"tool_use_id": "t1", "content": "no",
                                               "is_error": True}]}
        )

        assert message.content[0].is_error

    def test_an_assistant_turn_carries_its_tool_calls(self):
        message = message_from_item(
            {"role": "assistant", "text": "ser på filen",
             "tool_calls": [{"id": "t1", "name": "read_file", "input": {"path": "a.json"}}]}
        )

        assert isinstance(message.content[0], TextBlock)
        assert isinstance(message.content[1], ToolUseBlock)
        assert message.content[1].name == "read_file"

    def test_an_unknown_role_is_rejected(self):
        with pytest.raises(ValueError, match="unknown role"):
            message_from_item({"role": "system", "text": "x"})

    def test_a_whole_conversation_round_trips(self):
        messages = conversation_from_item(
            {"conversation": [
                {"role": "user", "text": "go"},
                {"role": "assistant", "tool_calls": [{"id": "t1", "name": "read_file"}]},
                {"role": "user", "tool_results": [{"tool_use_id": "t1", "content": "{}"}]},
            ]}
        )

        assert len(messages) == 3


class TestReadingTheReply:
    def test_tool_calls_and_text_are_both_extracted(self):
        reply = AssistantMessage(
            content=[
                TextBlock(text="jeg leser filen"),
                ToolUseBlock(id="t1", name="read_file", input={"path": "a.json"}),
            ],
            stop_reason="tool_use",
        )

        turn = turn_from_reply(reply)

        assert turn.tool_calls == [{"name": "read_file", "input": {"path": "a.json"}}]
        assert turn.text == "jeg leser filen"

    def test_a_final_answer_has_no_tool_calls(self):
        turn = turn_from_reply(
            AssistantMessage(content=[TextBlock(text="ferdig")], stop_reason="end_turn")
        )

        assert turn.tool_calls == []


class TestToolChoice:
    def test_the_expected_tool_scores_one(self):
        scores = tool_choice(output=_output(("read_file", {})), expected_output={"tool": "read_file"})

        assert scores[0].value == 1.0

    def test_the_wrong_tool_scores_zero(self):
        scores = tool_choice(output=_output(("edit_file", {})), expected_output={"tool": "read_file"})

        assert scores[0].value == 0.0
        assert "got edit_file" in scores[0].comment

    def test_no_tool_call_scores_zero_and_says_so(self):
        scores = tool_choice(output=_output(), expected_output={"tool": "read_file"})

        assert scores[0].value == 0.0
        assert "no tool call" in scores[0].comment

    def test_an_item_that_does_not_name_a_tool_is_not_scored(self):
        """Some items are only about stopping, or about JSON validity."""
        assert tool_choice(output=_output(), expected_output={"stop": True}) == []


class TestToolArguments:
    def test_only_the_named_keys_are_compared(self):
        """A tool call is mostly free-form content; asserting the whole payload
        would fail on wording rather than on the decision."""
        output = _output(("edit_file", {"path": "a.json", "old": "x", "new": "y"}))

        scores = tool_arguments(output=output, expected_output={"arguments": {"path": "a.json"}})

        assert scores[0].value == 1.0

    def test_a_partial_match_is_a_fraction(self):
        output = _output(("edit_file", {"path": "wrong.json", "layout": "Side1"}))

        scores = tool_arguments(
            output=output,
            expected_output={"arguments": {"path": "a.json", "layout": "Side1"}},
        )

        assert scores[0].value == 0.5

    def test_the_comment_names_what_differed(self):
        scores = tool_arguments(
            output=_output(("edit_file", {"path": "wrong.json"})),
            expected_output={"arguments": {"path": "a.json"}},
        )

        assert "expected 'a.json'" in scores[0].comment

    def test_no_call_at_all_scores_zero(self):
        scores = tool_arguments(output=_output(), expected_output={"arguments": {"path": "a"}})

        assert scores[0].value == 0.0


class TestForbiddenTools:
    def test_avoiding_them_scores_one(self):
        scores = forbidden_tools(
            output=_output(("read_file", {})),
            expected_output={"forbidden_tools": ["edit_file", "write_file"]},
        )

        assert scores[0].value == 1.0

    def test_using_one_scores_zero_and_names_it(self):
        """Writing before reading is the failure that costs a branch, not a retry."""
        scores = forbidden_tools(
            output=_output(("write_file", {})),
            expected_output={"forbidden_tools": ["edit_file", "write_file"]},
        )

        assert scores[0].value == 0.0
        assert "write_file" in scores[0].comment


class TestStoppedCleanly:
    def test_a_turn_that_should_finish_and_does(self):
        scores = stopped_cleanly(output=_output(stop_reason="end_turn"),
                                 expected_output={"stop": True})

        assert scores[0].value == 1.0

    def test_a_turn_that_should_finish_but_calls_a_tool(self):
        """The disabled-tool item: the result says do not retry, so another call
        burns the round budget."""
        scores = stopped_cleanly(output=_output(("preview_render_check", {})),
                                 expected_output={"stop": True})

        assert scores[0].value == 0.0
        assert "got a tool call" in scores[0].comment

    def test_a_turn_that_should_continue_but_stops(self):
        scores = stopped_cleanly(output=_output(), expected_output={"stop": False})

        assert scores[0].value == 0.0


class TestJsonArguments:
    def test_valid_json_content_scores_one(self):
        payload = json.dumps({"data": {"layout": []}})

        scores = json_arguments_parse(output=_output(("write_file", {"content": payload})))

        assert scores[0].value == 1.0

    def test_a_trailing_comma_fails_the_turn(self):
        """Right tool, unusable output. The benchmark would only see this as a
        broken app three steps later."""
        scores = json_arguments_parse(
            output=_output(("write_file", {"content": '{"a": 1,}'}))
        )

        assert scores[0].value == 0.0

    def test_non_json_content_is_not_judged_as_json(self):
        scores = json_arguments_parse(
            output=_output(("write_file", {"content": "just some text"}))
        )

        assert scores == [] or scores[0].value == 1.0

    def test_a_call_with_no_content_is_not_scored(self):
        assert json_arguments_parse(output=_output(("read_file", {"path": "a"}))) == []


class TestTheToolCatalog:
    def test_the_full_catalog_is_the_real_one(self):
        names = {schema["name"] for schema in tool_catalog()}

        assert {"read_file", "edit_file", "commit_session_branch"} <= names

    def test_narrowing_keeps_only_what_was_asked_for(self):
        """Narrowing is how an item makes a decision unambiguous."""
        schemas = tool_catalog(["read_file", "edit_file"])

        assert [s["name"] for s in schemas] == ["read_file", "edit_file"]

    def test_an_unknown_tool_fails_loudly(self):
        with pytest.raises(ValueError, match="unknown tool"):
            tool_catalog(["no_such_tool"])


class TestTheTaskEndToEnd:
    """The task with the model faked out: the seam is `build_adapter`, so nothing
    reaches a provider and no tool is ever executed."""

    @pytest.fixture
    def fake_adapter(self, monkeypatch):
        from agents.core import llm_adapter
        from benchmarks import generation

        seen = {}

        class Fake:
            model = "fake-model"

            async def chat(self, messages, system_prompt, tool_schemas, **_):
                seen["messages"] = messages
                seen["system_prompt"] = system_prompt
                seen["tools"] = [s["name"] for s in tool_schemas]
                return AssistantMessage(
                    content=[ToolUseBlock(id="t9", name="read_file",
                                          input={"path": "App/ui/form/layouts/Side1.json"})],
                    stop_reason="tool_use",
                )

        monkeypatch.setattr(llm_adapter, "build_adapter", lambda role, **k: Fake())
        monkeypatch.setattr(generation, "build_adapter", lambda role, **k: Fake(), raising=False)
        return seen

    @pytest.mark.asyncio
    async def test_the_turn_is_scored_without_executing_anything(self, fake_adapter):
        from benchmarks.generation import GenerationTask

        item = {
            "id": "read-before-write",
            "input": {
                "goal": "endre tittelen",
                "conversation": [{"role": "user", "text": "endre tittelen"}],
                "tools": ["read_file", "edit_file"],
            },
        }

        output = await GenerationTask()(item=item)

        assert output["tool_calls"][0]["name"] == "read_file"
        assert output["model"] == "fake-model"
        assert output["role"] == "actor"

    @pytest.mark.asyncio
    async def test_the_real_system_prompt_is_composed_from_the_goal(self, fake_adapter):
        """Items name a goal instead of carrying 13k characters each, so a prompt
        edit reaches every item at once."""
        from benchmarks.generation import GenerationTask

        item = {
            "input": {
                "goal": "legg til et felt for fornavn",
                "conversation": [{"role": "user", "text": "legg til et felt for fornavn"}],
            }
        }

        await GenerationTask()(item=item)

        assert "fornavn" in fake_adapter["system_prompt"]
        assert len(fake_adapter["system_prompt"]) > 5000

    @pytest.mark.asyncio
    async def test_the_item_narrows_the_catalog(self, fake_adapter):
        from benchmarks.generation import GenerationTask

        item = {
            "input": {
                "goal": "g",
                "conversation": [{"role": "user", "text": "g"}],
                "tools": ["read_file", "edit_file"],
            }
        }

        await GenerationTask()(item=item)

        assert fake_adapter["tools"] == ["read_file", "edit_file"]

    @pytest.mark.asyncio
    async def test_an_item_with_neither_prompt_nor_goal_fails(self, fake_adapter):
        from benchmarks.generation import GenerationTask

        with pytest.raises(ValueError, match="system_prompt_trace or goal"):
            await GenerationTask()(item={"input": {"conversation": []}})


class TestTheUiVariant:
    """Prompt Experiments cannot pass tools, so the UI path uses text and JSON."""

    def test_the_goal_becomes_a_langfuse_variable(self):
        from benchmarks.generation import ui_system_prompt

        prompt = ui_system_prompt()

        assert "{{goal}}" in prompt
        assert "__GOAL__" not in prompt

    def test_the_rest_of_the_prompt_is_what_the_agent_runs(self):
        from benchmarks.generation import actor_system_prompt, ui_system_prompt

        real = actor_system_prompt("some goal")
        ui = ui_system_prompt()

        # These must survive verbatim, or the experiment tests a prompt nobody runs.
        assert real.split("\n\n")[0] in ui

    def test_it_fails_loudly_if_the_goal_stops_being_verbatim(self, monkeypatch):
        """The templating depends on the sentinel surviving prompt composition."""
        from benchmarks import generation

        monkeypatch.setattr(generation, "actor_system_prompt", lambda *a, **k: "no goal here")

        with pytest.raises(RuntimeError, match="no longer carries the goal"):
            generation.ui_system_prompt()

    def test_the_catalog_is_rendered_with_argument_schemas(self):
        from benchmarks.generation import render_tool_catalog

        text = render_tool_catalog()

        assert "### read_file" in text
        assert "### edit_file" in text
        assert "input_schema" in text or "properties" in text

    def test_a_prior_turn_is_written_in_the_answer_contract(self):
        """Claude imitated a transcript notation instead of answering when the two
        differed, so the previous turns are examples of the contract now."""
        import json

        from benchmarks.generation import DECISION_SCHEMA, as_chat_messages

        messages = as_chat_messages(
            [{"role": "assistant",
              "tool_calls": [{"id": "t1", "name": "read_file", "input": {"path": "a.json"}}]}]
        )

        decision = json.loads(messages[0]["content"])
        assert set(decision) == set(DECISION_SCHEMA["required"])
        assert decision["tool_calls"][0]["tool"] == "read_file"
        assert json.loads(decision["tool_calls"][0]["arguments_json"]) == {"path": "a.json"}
        assert decision["done"] is False

    def test_a_prior_final_answer_is_marked_done(self):
        import json

        from benchmarks.generation import as_chat_messages

        messages = as_chat_messages([{"role": "assistant", "text": "ferdig"}])

        assert json.loads(messages[0]["content"])["done"] is True

    def test_no_transcript_notation_leaks_into_a_turn(self):
        """The notation is what the model copied; it must not appear at all."""
        from benchmarks.dataset_sync import load_datasets, render_input

        dataset = next(d for d in load_datasets() if d.kind == "generation")

        for item in dataset.items:
            for message in render_input(dataset, item)["chat_messages"]:
                if message["role"] == "assistant":
                    assert "[tool_call]" not in message["content"], item["id"]

    def test_a_stubbed_result_becomes_readable_text(self):
        from benchmarks.generation import as_chat_messages

        messages = as_chat_messages(
            [{"role": "user", "tool_results": [{"tool_use_id": "t1", "content": "{}"}]}]
        )

        assert messages[0]["content"] == "[tool_result]: {}"

    def test_an_error_result_is_marked_as_one(self):
        from benchmarks.generation import as_chat_messages

        messages = as_chat_messages(
            [{"role": "user",
              "tool_results": [{"tool_use_id": "t1", "content": "nope", "is_error": True}]}]
        )

        assert "[tool_result err]" in messages[0]["content"]

    def test_every_message_has_a_role_and_content(self):
        """A placeholder takes plain chat messages; anything else is dropped by the
        provider without an error."""
        from benchmarks.dataset_sync import load_datasets, render_input

        dataset = next(d for d in load_datasets() if d.kind == "generation")

        for item in dataset.items:
            for message in render_input(dataset, item)["chat_messages"]:
                assert set(message) == {"role", "content"}, item["id"]
                assert message["role"] in {"user", "assistant"}
                assert message["content"]


class TestBothPathsScoreTheSame:
    def test_a_ui_decision_maps_onto_the_sdk_output_shape(self):
        from benchmarks.generation import tool_choice, ui_output_as_tool_calls

        output = ui_output_as_tool_calls(
            {"tool": "verify_changes", "arguments": {}, "done": False, "text": ""}
        )

        assert tool_choice(output=output,
                           expected_output={"tool": "verify_changes"})[0].value == 1.0

    def test_a_done_decision_has_no_tool_call(self):
        from benchmarks.generation import stopped_cleanly, ui_output_as_tool_calls

        output = ui_output_as_tool_calls(
            {"tool": None, "arguments": {}, "done": True, "text": "ferdig"}
        )

        assert output["tool_calls"] == []
        assert stopped_cleanly(output=output, expected_output={"stop": True})[0].value == 1.0

    def test_a_ui_decision_is_checked_for_forbidden_tools_too(self):
        from benchmarks.generation import forbidden_tools, ui_output_as_tool_calls

        output = ui_output_as_tool_calls(
            {"tool": "commit_session_branch", "arguments": {}, "done": False, "text": ""}
        )

        scores = forbidden_tools(
            output=output, expected_output={"forbidden_tools": ["commit_session_branch"]}
        )

        assert scores[0].value == 0.0


class TestAllowedTools:
    """A turn usually has more than one defensible next step. Naming one tool
    scored both models as failing for choosing a reasonable alternative."""

    def test_any_accepted_tool_scores_one(self):
        from benchmarks.generation import allowed_tools

        for chosen in ("scan_repo", "read_file"):
            scores = allowed_tools(
                output=_output((chosen, {})),
                expected_output={"allowed_tools": ["scan_repo", "read_file"]},
            )
            assert scores[0].value == 1.0, chosen

    def test_a_tool_outside_the_set_scores_zero(self):
        from benchmarks.generation import allowed_tools

        scores = allowed_tools(
            output=_output(("write_file", {})),
            expected_output={"allowed_tools": ["scan_repo", "read_file"]},
        )

        assert scores[0].value == 0.0
        assert "accepted ['read_file', 'scan_repo']" in scores[0].comment

    def test_an_item_without_the_key_is_not_scored(self):
        from benchmarks.generation import allowed_tools

        assert allowed_tools(output=_output(), expected_output={"stop": True}) == []


class TestTheItemsAssertTheRuleAndNotOneTool:
    def test_every_item_names_a_set_or_an_invariant(self):
        """An item that names a single exact tool is usually the item being wrong,
        which is what the first run showed."""
        from benchmarks.dataset_sync import load_datasets
        from benchmarks.generation import rule_of

        dataset = next(d for d in load_datasets() if d.kind == "generation")

        for item in dataset.items:
            rule = rule_of(item["expectedOutput"])
            assert (
                "allowed_tools" in rule or "forbidden_tools" in rule or "stop" in rule
            ), item["id"]
            assert "tool" not in rule, (
                f"{item['id']} pins one exact tool in its rule; prefer allowed_tools"
            )


class TestExpectedOutputMirrorsTheAnswer:
    """The comparison view diffs expected against actual, so an expected output
    written as a bare rule reads as a total mismatch even when the model is right."""

    def test_it_leads_with_the_decision_fields(self):
        from benchmarks.dataset_sync import load_datasets

        dataset = next(d for d in load_datasets() if d.kind == "generation")

        for item in dataset.items:
            expected = item["expectedOutput"]
            assert {"tool_calls", "done"} <= set(expected), item["id"]

    def test_the_canonical_answer_satisfies_its_own_rule(self):
        """A canonical answer that its own rule would fail is a broken item."""
        from benchmarks.dataset_sync import load_datasets
        from benchmarks.generation import ITEM_EVALUATORS, ui_output_as_tool_calls

        datasets = [d for d in load_datasets() if d.kind == "generation"]
        assert datasets

        for dataset in datasets:
            for item in dataset.items:
                if item["metadata"].get("regression"):
                    # A regression item fails its own rule by design; covered below.
                    continue
                expected = item["expectedOutput"]
                output = ui_output_as_tool_calls(expected)
                for evaluator in ITEM_EVALUATORS:
                    for score in evaluator(output=output, expected_output=expected) or []:
                        want = "correct" if score.name == "gen_failure_mode" else 1.0
                        assert score.value == want, (
                            f"{dataset.name}/{item['id']}: {score.name} = "
                            f"{score.value} ({score.comment})"
                        )

    def test_the_rule_is_not_mistaken_for_the_answer(self):
        from benchmarks.generation import rule_of

        expected = {"tool": "edit_file", "arguments": {}, "done": False,
                    "rule": {"allowed_tools": ["edit_file"]}}

        assert rule_of(expected) == {"allowed_tools": ["edit_file"]}

    def test_an_expected_output_with_no_rule_is_read_directly(self):
        """Older items, and the gate datasets, have no rule block."""
        from benchmarks.generation import rule_of

        assert rule_of({"allowed_tools": ["x"]}) == {"allowed_tools": ["x"]}


class TestRenamingAnItemDoesNotLeaveADuplicate:
    """Item ids are the upsert key, so a rename once left the old id still running."""

    def test_sync_archives_remote_items_the_file_dropped(self):
        from benchmarks.dataset_sync import Dataset, _archive_orphans
        from pathlib import Path

        archived = []

        class Item:
            def __init__(self, id, status="ACTIVE"):
                self.id, self.status = id, status

        class Client:
            def get_dataset(self, name):
                return type("D", (), {"items": [Item("kept"), Item("dropped"),
                                                Item("already", "ARCHIVED")]})()

        class Api:
            def upsert_dataset_item(self, **kwargs):
                archived.append((kwargs["item_id"], kwargs.get("status")))

        dataset = Dataset(
            name="Loop/traces", prompt=None, description="d",
            path=Path("x.jsonl"), items=[{"id": "kept"}], kind="generation",
        )

        _archive_orphans(Client(), Api(), dataset)

        assert archived == [("dropped", "ARCHIVED")]

    def test_an_already_archived_item_is_left_alone(self):
        """Re-archiving on every sync would churn the audit trail."""
        from benchmarks.dataset_sync import Dataset, _archive_orphans
        from pathlib import Path

        calls = []

        class Client:
            def get_dataset(self, name):
                item = type("I", (), {"id": "gone", "status": "ARCHIVED"})()
                return type("D", (), {"items": [item]})()

        class Api:
            def upsert_dataset_item(self, **kwargs):
                calls.append(kwargs)

        _archive_orphans(
            Client(), Api(),
            Dataset(name="d", prompt=None, description="d", path=Path("x"),
                    items=[], kind="generation"),
        )

        assert calls == []


class TestArgumentsTravelEncoded:
    """`additionalProperties: false` permits no keys, so arguments travel encoded."""

    def test_the_schema_declares_no_free_form_object(self):
        from benchmarks.generation import DECISION_SCHEMA

        for name, spec in DECISION_SCHEMA["properties"].items():
            assert spec["type"] != "object", name

    def test_every_property_is_required_as_strict_mode_demands(self):
        from benchmarks.generation import DECISION_SCHEMA

        assert set(DECISION_SCHEMA["required"]) == set(DECISION_SCHEMA["properties"])

    def test_the_encoded_form_is_decoded(self):
        from benchmarks.generation import decoded_arguments

        assert decoded_arguments({"arguments_json": '{"path": "a.json"}'}) == {"path": "a.json"}

    def test_a_run_from_before_the_change_still_decodes(self):
        from benchmarks.generation import decoded_arguments

        assert decoded_arguments({"arguments": {"path": "b.json"}}) == {"path": "b.json"}

    def test_unparseable_arguments_do_not_crash_a_run(self):
        from benchmarks.generation import decoded_arguments

        assert decoded_arguments({"arguments_json": "not json"}) == {}
        assert decoded_arguments({"arguments_json": '"a string"'}) == {}

    def test_the_json_check_reads_content_out_of_the_encoded_form(self):
        """gen_json_parses is the only scorer that needs the argument values, and
        it is what new-layout-is-valid-json exists for."""
        from benchmarks.generation import json_arguments_parse, ui_output_as_tool_calls

        good = ui_output_as_tool_calls(
            {"tool": "write_file", "arguments_json": '{"content": "{\\"a\\": 1}"}'}
        )
        bad = ui_output_as_tool_calls(
            {"tool": "write_file", "arguments_json": '{"content": "{\\"a\\": 1,}"}'}
        )

        assert json_arguments_parse(output=good)[0].value == 1.0
        assert json_arguments_parse(output=bad)[0].value == 0.0


class TestHarvestedItemsCarryTheirProvenance:
    """A trace-derived expectation is ground truth only once somebody verified it."""

    def _harvested(self):
        from benchmarks.dataset_sync import load_datasets

        return [d for d in load_datasets() if d.name == "Loop/traces"]

    def test_the_dataset_exists(self):
        assert self._harvested()

    def test_every_item_names_its_trace_and_decision(self):
        for dataset in self._harvested():
            for item in dataset.items:
                metadata = item["metadata"]
                assert metadata["source_trace"], item["id"]
                assert isinstance(metadata["source_decision"], int), item["id"]

    def test_every_item_records_how_far_it_was_verified(self):
        from benchmarks.harvest import VERIFICATION_LEVELS

        for dataset in self._harvested():
            for item in dataset.items:
                assert item["metadata"]["verification"] in VERIFICATION_LEVELS, item["id"]

    def test_no_item_comes_from_a_run_with_a_known_defect(self):
        """Harvesting a defective run would encode the defect as the expectation."""
        for dataset in self._harvested():
            for item in dataset.items:
                assert item["metadata"]["verification"] != "known-defect", item["id"]

    def test_a_defective_decision_is_named_rather_than_hidden(self):
        """One trace has a bounded defect. The decision that produced it is usable
        for tool choice and must say so, or somebody later asserts its content."""
        from benchmarks.harvest import CONTENT_RULE_KEYS
        from benchmarks.generation import rule_of

        defective = [
            item
            for dataset in self._harvested()
            for item in dataset.items
            if item["metadata"].get("defect")
        ]

        assert defective, "the defect-carrying decision should still be harvested"
        for item in defective:
            assert item["metadata"]["verification"] == "app-verified-with-defect"
            assert not CONTENT_RULE_KEYS & rule_of(item["expectedOutput"]).keys(), item["id"]

    def test_content_is_never_asserted_on_a_defective_decision(self):
        """Enforced in the harvester too, so a spec edit cannot slip it past."""
        import httpx
        import pytest

        from benchmarks.harvest import HarvestedTrace, Turn, item_from_decision

        harvest = HarvestedTrace(
            trace_id="t", goal="g", available_tools=[],
            turns=[Turn(text="", calls=[{"name": "write_file", "input": {}}])],
        )

        with pytest.raises(ValueError, match="known defect"):
            item_from_decision(
                harvest, 0, item_id="x", note="n",
                verification="app-verified-with-defect",
                rule={"arguments": {"path": "a.json"}},
                defect="the e3-date component omits timeStamp",
            )

    def test_the_observed_tools_are_kept_beside_the_rule(self):
        """What the agent did and what it should have done are different claims,
        so both are recorded and only the rule is scored."""
        for dataset in self._harvested():
            for item in dataset.items:
                assert "observed_tools" in item["metadata"], item["id"]


class TestRealTurnsCarrySeveralCalls:
    def test_a_harvested_turn_can_hold_more_than_one_call(self):
        """Production turns carry two to eleven calls. Scoring only the first was
        measuring a decision the model never made."""
        from benchmarks.dataset_sync import load_datasets

        dataset = next(d for d in load_datasets() if d.name == "Loop/traces")
        widest = max(
            len(entry.get("tool_calls") or [])
            for item in dataset.items
            for entry in item["input"]["conversation"]
            if entry["role"] == "assistant"
        )

        assert widest > 1

    def test_coverage_is_a_fraction_not_a_verdict(self):
        from benchmarks.generation import required_tools, ui_output_as_tool_calls

        output = ui_output_as_tool_calls(
            {"tool_calls": [{"tool": "edit_file", "arguments_json": "{}"}], "done": False}
        )

        scores = required_tools(
            output=output,
            expected_output={"rule": {"required_tools": ["edit_file", "write_file"]}},
        )

        assert scores[0].value == 0.5
        assert "missing ['write_file']" in scores[0].comment

    def test_a_forbidden_call_anywhere_in_the_turn_is_caught(self):
        """It could be the fourth of five calls, not the first."""
        from benchmarks.generation import forbidden_tools, ui_output_as_tool_calls

        output = ui_output_as_tool_calls(
            {
                "tool_calls": [
                    {"tool": "read_file", "arguments_json": "{}"},
                    {"tool": "commit_session_branch", "arguments_json": "{}"},
                ],
                "done": False,
            }
        )

        scores = forbidden_tools(
            output=output,
            expected_output={"rule": {"forbidden_tools": ["commit_session_branch"]}},
        )

        assert scores[0].value == 0.0


class TestFailureModeNamesTheProblem:
    """A boolean says a run is worse; a category says how."""

    def _mode(self, decision, rule):
        from benchmarks.generation import failure_mode, ui_output_as_tool_calls

        scores = failure_mode(
            output=ui_output_as_tool_calls(decision), expected_output={"rule": rule}
        )
        return scores[0].value

    def test_a_good_turn_is_correct(self):
        assert self._mode(
            {"tool_calls": [{"tool": "verify_changes", "arguments_json": "{}"}]},
            {"required_tools": ["verify_changes"], "stop": False},
        ) == "correct"

    def test_stopping_when_asked_to_stop_is_correct_even_with_an_allowed_set(self):
        """An empty turn counted as a call outside the set, so a model that stopped as
        asked was named a tool violator while `stopped_cleanly` scored the same turn 1."""
        assert self._mode(
            {"tool_calls": [], "message": "done"},
            {"allowed_tools": ["read_file"], "stop": True},
        ) == "correct"

    def test_a_call_outside_the_allowed_set_is_still_named(self):
        assert self._mode(
            {"tool_calls": [{"tool": "write_file", "arguments_json": "{}"}]},
            {"allowed_tools": ["read_file"], "stop": False},
        ) == "tool_outside_set"

    def test_an_empty_turn_that_owed_a_call_is_still_named(self):
        assert self._mode(
            {"tool_calls": [], "message": "done"},
            {"allowed_tools": ["read_file"], "required_tools": ["read_file"], "stop": False},
        ) == "missing_tool"

    def test_a_forbidden_call_outranks_the_others(self):
        assert self._mode(
            {"tool_calls": [{"tool": "commit_session_branch", "arguments_json": "{}"}]},
            {"required_tools": ["verify_changes"],
             "forbidden_tools": ["commit_session_branch"], "stop": False},
        ) == "forbidden_tool"

    def test_a_missing_call_is_named_as_such(self):
        assert self._mode(
            {"tool_calls": [{"tool": "edit_file", "arguments_json": "{}"}]},
            {"required_tools": ["edit_file", "write_file"], "stop": False},
        ) == "missing_tool"

    def test_finishing_too_early_is_named(self):
        assert self._mode({"tool_calls": [], "done": True}, {"stop": False}) == "stopped_early"

    def test_not_finishing_is_named(self):
        assert self._mode(
            {"tool_calls": [{"tool": "preview_render_check", "arguments_json": "{}"}]},
            {"stop": True},
        ) == "did_not_stop"

    def test_every_mode_it_can_return_is_declared(self):
        from benchmarks.generation import FAILURE_MODES

        assert "correct" in FAILURE_MODES
        assert set(FAILURE_MODES) >= {
            "off_contract", "missing_tool", "forbidden_tool",
            "tool_outside_set", "stopped_early", "did_not_stop",
        }


class TestHarvestedConversationsAreValidProtocol:
    """A tool result whose id names no preceding call is rejected."""

    def _items(self):
        from benchmarks.dataset_sync import load_datasets

        return next(d for d in load_datasets() if d.name == "Loop/traces").items

    def test_every_result_answers_a_call_in_the_turn_before_it(self):
        for item in self._items():
            offered: set[str] = set()
            for entry in item["input"]["conversation"]:
                if entry["role"] == "assistant":
                    offered = {call["id"] for call in entry.get("tool_calls") or []}
                elif "tool_results" in entry:
                    answered = {r["tool_use_id"] for r in entry["tool_results"]}
                    assert answered <= offered, f"{item['id']}: {answered - offered}"

    def test_every_call_is_answered(self):
        """An unanswered call is rejected as surely as an unmatched result."""
        for item in self._items():
            pending: set[str] = set()
            for entry in item["input"]["conversation"]:
                if entry["role"] == "assistant":
                    assert not pending, f"{item['id']}: unanswered {pending}"
                    pending = {call["id"] for call in entry.get("tool_calls") or []}
                elif "tool_results" in entry:
                    pending -= {r["tool_use_id"] for r in entry["tool_results"]}
            assert not pending, f"{item['id']}: unanswered {pending}"

    def test_call_ids_are_unique_across_the_conversation(self):
        for item in self._items():
            ids = [
                call["id"]
                for entry in item["input"]["conversation"]
                if entry["role"] == "assistant"
                for call in entry.get("tool_calls") or []
            ]
            assert len(ids) == len(set(ids)), item["id"]

    def test_an_unequal_turn_fails_loudly(self):
        """Pairing is positional, so a mismatch would answer the wrong call."""
        import pytest

        from benchmarks.harvest import HarvestedTrace, Turn, conversation_up_to

        harvest = HarvestedTrace(
            trace_id="t", goal="g", available_tools=[],
            turns=[
                Turn(text="", calls=[{"id": "a", "name": "read_file", "input": {}},
                                     {"id": "b", "name": "read_file", "input": {}}],
                     results=[{"name": "read_file", "content": "x", "is_error": False}]),
                Turn(text="", calls=[]),
            ],
        )

        with pytest.raises(ValueError, match="cannot pair them"):
            conversation_up_to(harvest, 1)
