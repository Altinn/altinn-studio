"""Which files move which axis."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from benchmarks import impact

ASSISTANT_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture(autouse=True)
def _digests_match_the_baseline(monkeypatch):
    """The path tests get the digests in BASELINE.json, so the real digests have no effect on them."""
    from benchmarks import baseline

    pointer = baseline.read()
    recorded = pointer.axes if pointer else {}
    monkeypatch.setattr(impact, "current_digests", lambda: {axis: recorded.get(axis) for axis, _ in impact.DIGESTS})


def test_a_dataset_edit_invalidates_the_baseline():
    found = impact.analyze(["benchmarks/datasets/gates_scope.jsonl"])
    assert found.needs_rebaseline
    assert found.axes == ("dataset",)
    assert any("not comparable" in line for line in found.explain())


def test_an_evaluator_change_invalidates_the_baseline():
    for path in (
        "benchmarks/gates.py",
        "benchmarks/planner.py",
        "benchmarks/generation.py",
        "benchmarks/evaluators.py",
        "benchmarks/outputs.py",
        "benchmarks/preview_check.py",
    ):
        found = impact.analyze([path])
        assert found.needs_rebaseline, path
        assert found.axes == ("evaluators",), path


def test_a_loop_change_needs_a_check_but_keeps_the_baseline():
    found = impact.analyze(["agents/core/loop.py"])
    assert found.needs_check
    assert not found.needs_rebaseline
    assert any("without moving the yardstick" in line for line in found.explain())


def test_a_config_change_needs_a_check_but_keeps_the_baseline():
    found = impact.analyze(["shared/config/base_config.py"])
    assert found.needs_check
    assert not found.needs_rebaseline


def test_the_manifest_needs_a_check_but_keeps_the_baseline():
    """Declaring a behavior does not change how anything is scored."""
    found = impact.analyze(["benchmarks/manifest.py"])
    assert found.needs_check
    assert not found.needs_rebaseline


def test_an_unrelated_change_needs_nothing():
    found = impact.analyze(["README.md", "charts/values.yaml", "src/Designer/frontend/x.tsx"])
    assert not found.needs_check
    assert not found.needs_rebaseline
    assert "Nothing in this change" in found.explain()[0]


def test_a_test_change_needs_nothing():
    """Tests cannot move an axis, and treating them as a yardstick change is noise."""
    found = impact.analyze(["tests/unit/benchmarks/test_workbench.py"])
    assert not found.needs_check


def test_repo_relative_and_agents_relative_paths_both_work():
    """`git diff --name-only` output is repo relative and is fed in as it comes."""
    a = impact.analyze(["src/AI/assistant/benchmarks/datasets/gates_scope.jsonl"])
    b = impact.analyze(["benchmarks/datasets/gates_scope.jsonl"])
    assert a.axes == b.axes == ("dataset",)


def test_both_kinds_are_reported_when_both_are_present():
    found = impact.analyze(["benchmarks/datasets/x.jsonl", "agents/core/loop.py"])
    assert found.needs_rebaseline
    assert found.yardstick_hits and found.behavior_hits


def test_the_gate_says_one_thing_about_the_baseline(capsys):
    """It asserted the baseline was stale and then that it travelled with the
    change, in the same output."""
    impact.report(["src/AI/assistant/benchmarks/gates.py", "src/AI/assistant/benchmarks/BASELINE.json"], strict=True)
    said = capsys.readouterr().out

    assert "was measured with this instrument" in said
    assert "not comparable" not in said


def test_without_a_new_baseline_it_still_says_stale(capsys):
    code = impact.report(["src/AI/assistant/benchmarks/gates.py"], strict=True)
    said = capsys.readouterr().out

    assert code == 1
    assert "not comparable" in said
    assert "was measured with this instrument" not in said


class TestTheDigestsDecideForThePromptAndTheTools:
    """A path rule can only guess which files move a digest. The gate compares the digests."""

    RECORDED = {"actor_prompt": "aaaaaaaaaaaa", "tools": "bbbbbbbbbbbb"}

    @pytest.fixture(autouse=True)
    def _pointer(self, monkeypatch):
        from benchmarks import baseline

        pointer = baseline.Pointer(
            check_id="check-1", label="check-1", recorded_at="", why="a test", axes=dict(self.RECORDED)
        )
        monkeypatch.setattr(baseline, "read", lambda **_kwargs: pointer)

    def _report(self, capsys, current, changed=()):
        code = impact.report(list(changed), strict=True, measure=lambda: current)
        return code, capsys.readouterr().out

    def test_equal_digests_move_no_axis(self, capsys):
        code, said = self._report(capsys, dict(self.RECORDED))
        assert code == 0
        assert "Nothing in this change" in said

    def test_a_changed_digest_fails_also_without_a_path_rule(self, capsys):
        """No path rule matches `agentic_loop_node.py`. But this file sets the tools that the actor gets."""
        code, said = self._report(
            capsys,
            {**self.RECORDED, "tools": "cccccccccccc"},
            ["src/AI/assistant/agents/graph/nodes/agentic_loop_node.py"],
        )
        assert code == 1
        assert "tools  baseline bbbbbbbbbbbb, this checkout cccccccccccc" in said
        assert "actor_prompt  baseline" not in said
        assert "INVALIDATES THE BASELINE" in said

    def test_a_failed_digest_fails(self, capsys):
        """If a dependency is broken, the gate must fail. It must not pass."""
        code, said = self._report(capsys, {**self.RECORDED, "actor_prompt": None})
        assert code == 1
        assert "actor_prompt  baseline aaaaaaaaaaaa, this checkout failed" in said
        assert "The error is in the log" in said

    def test_a_digest_that_the_baseline_did_not_record_is_not_equal(self):
        """`runner check` refuses an axis that one side did not record."""
        drift = impact.compare_digests(
            {"actor_prompt": impact.NOT_RECORDED, "tools": "b"}, {"actor_prompt": "a", "tools": "b"}
        )
        assert [d.axis for d in drift] == ["actor_prompt"]

    def test_a_new_baseline_for_other_code_still_fails(self, capsys):
        code, said = self._report(
            capsys, {**self.RECORDED, "tools": "cccccccccccc"}, ["src/AI/assistant/benchmarks/BASELINE.json"]
        )
        assert code == 1
        assert "NOT FOR THIS CODE" in said
        assert "was measured with this instrument" not in said

    def test_a_new_baseline_for_this_code_passes(self, capsys):
        code, _said = self._report(
            capsys, dict(self.RECORDED), ["src/AI/assistant/benchmarks/BASELINE.json", "benchmarks/datasets/x.jsonl"]
        )
        assert code == 0

    def test_without_a_baseline_the_gate_compares_no_digest(self, monkeypatch, capsys):
        from benchmarks import baseline

        monkeypatch.setattr(baseline, "read", lambda **_kwargs: None)
        code, _said = self._report(capsys, {"actor_prompt": None, "tools": None})
        assert code == 0

    def test_the_gate_compares_the_digests_that_a_run_records(self):
        from benchmarks.provenance import BLOCKING_AXES, digests

        measured = digests()
        assert set(measured) == {axis for axis, _because in impact.DIGESTS}
        assert set(measured) <= set(BLOCKING_AXES)
        assert None not in measured.values(), "a digest fails in the test environment, so it also fails in CI"


def test_every_declared_pattern_matches_something_that_exists():
    """A rule for a path that is gone is a rule that silently stops working."""
    import fnmatch

    tracked = [
        str(path.relative_to(ASSISTANT_ROOT))
        for path in ASSISTANT_ROOT.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts
    ]
    for pattern, _axis, _why in impact.YARDSTICK + impact.BEHAVIOR:
        matched = any(fnmatch.fnmatch(path, pattern) for path in tracked)
        assert matched, f"{pattern} matches nothing in the repo any more"


def test_every_yardstick_axis_is_one_a_comparison_actually_blocks_on():
    from benchmarks.provenance import BLOCKING_AXES

    for _pattern, axis, _why in impact.YARDSTICK:
        assert axis in BLOCKING_AXES, (
            f"{axis} is declared as a yardstick change but a comparison does not block "
            "on it, so requiring a re-baseline for it is theater"
        )


def test_every_rule_says_why_in_words_a_reviewer_can_use():
    for _pattern, _axis, because in impact.YARDSTICK + impact.BEHAVIOR:
        assert len(because) > 20, because
        assert not because.endswith("."), "the reason is a clause, not a sentence"


class TestTheFailureTellsYouWhatToDo:
    """CI shows a job log and nothing else, so the message has to carry it all."""

    @pytest.fixture(autouse=True)
    def _only_the_paths_decide(self, monkeypatch):
        """The paths did not change in this checkout, so a source comparison finds no change."""
        monkeypatch.setattr(impact, "git_reader", lambda _against: None)

    def _run_impact(self, paths, tmp_path, strict=True):
        import argparse
        import contextlib
        import io

        from benchmarks import runner

        args = argparse.Namespace(paths=paths, against="origin/main", strict=strict)
        out = io.StringIO()
        code = 0
        with contextlib.redirect_stdout(out):
            try:
                runner.cmd_impact(args)
            except SystemExit as exit_code:
                code = exit_code.code or 0
        return code, out.getvalue()

    def test_a_yardstick_change_without_a_pointer_fails(self, tmp_path):
        code, text = self._run_impact(["benchmarks/datasets/gates_scope.jsonl"], tmp_path)
        assert code == 1
        assert "INVALIDATES THE BASELINE" in text

    def test_the_failure_names_the_commands_to_run(self, tmp_path):
        _code, text = self._run_impact(["benchmarks/datasets/gates_scope.jsonl"], tmp_path)
        assert "runner check --label" in text
        assert "runner baseline <check id> --why" in text
        assert "commit benchmarks/BASELINE.json" in text
        assert "workbench.html" in text, "reading the report is part of the instruction"

    def test_the_failure_offers_the_other_answer(self, tmp_path):
        """Sometimes the right fix is to not change the yardstick."""
        _code, text = self._run_impact(["benchmarks/outputs.py"], tmp_path)
        assert "did not mean to change the yardstick" in text

    def test_a_change_carrying_a_new_pointer_passes(self, tmp_path):
        code, text = self._run_impact(["benchmarks/datasets/gates_scope.jsonl", "benchmarks/BASELINE.json"], tmp_path)
        assert code == 0
        assert "measured with this instrument" in text

    def test_a_behavior_change_passes(self, tmp_path):
        code, _text = self._run_impact(["agents/core/loop.py"], tmp_path)
        assert code == 0

    def test_without_strict_it_reports_and_does_not_fail(self, tmp_path):
        """So a developer can ask before pushing without the command exiting non-zero."""
        code, text = self._run_impact(["benchmarks/datasets/gates_scope.jsonl"], tmp_path, strict=False)
        assert code == 0
        assert "INVALIDATES THE BASELINE" in text


class TestTheGateEntryPoints:
    """CI and `runner impact` call the same report."""

    def test_the_module_is_runnable_as_a_script(self):
        from benchmarks import impact

        assert hasattr(impact, "report")
        assert hasattr(impact, "_main")

    def test_the_runner_and_the_gate_share_one_report(self):
        """Two copies of this message would drift, and only one of them is tested."""
        source = (ASSISTANT_ROOT / "benchmarks" / "runner.py").read_text()
        assert "impact.report(" in source
        assert "INVALIDATES THE BASELINE" not in source


class TestTheCommandCatalogue:
    """One declaration feeds the menu and `--help`, so they cannot drift apart."""

    def test_every_command_is_described_once(self):
        from benchmarks import runner

        names = [e.name for e in runner.CATALOGUE]
        assert len(names) == len(set(names))
        for entry in runner.CATALOGUE:
            assert entry.does and not entry.does.endswith("."), entry.name
            assert entry.when and not entry.when.endswith("."), entry.name

    def test_the_parser_and_the_catalogue_cover_the_same_commands(self):
        from benchmarks import runner

        parser = runner._parser()
        actions = [a for a in parser._actions if a.__class__.__name__ == "_SubParsersAction"]
        assert actions, "the parser has no subcommands"
        assert actions[0].choices is not None
        assert set(actions[0].choices) == {e.name for e in runner.CATALOGUE}

    def test_help_text_comes_from_the_catalogue(self):
        from benchmarks import runner

        for entry in runner.CATALOGUE:
            assert runner._describe(entry.name) == entry.does

    def test_the_menu_does_not_block_when_stdin_is_not_a_terminal(self, monkeypatch, capsys):
        """CI and pipes must get the list and an exit, never a prompt that waits."""
        from benchmarks import runner

        monkeypatch.setattr("sys.stdin.isatty", lambda: False)
        monkeypatch.setattr("builtins.input", lambda *_: pytest.fail("the menu prompted without a terminal"))
        assert runner.menu() == 0
        printed = capsys.readouterr().out
        for entry in runner.CATALOGUE:
            assert entry.does in printed

    def test_a_command_needing_input_says_so_in_the_menu(self, monkeypatch, capsys):
        from benchmarks import runner

        monkeypatch.setattr("sys.stdin.isatty", lambda: False)
        runner.menu()
        printed = capsys.readouterr().out
        for entry in runner.CATALOGUE:
            if entry.needs_input:
                assert f"needs: {entry.needs_input}" in printed

    def test_adopting_a_baseline_from_the_menu_still_requires_a_reason(self, monkeypatch):
        """The menu is a way in, not a way round the rules."""
        from benchmarks import runner

        answers = iter(["1", ""])
        monkeypatch.setattr("builtins.input", lambda *_: next(answers))
        monkeypatch.setattr(
            "benchmarks.runstore.all_runs",
            lambda **_: (type("R", (), {"name": "20260909T100000Z-x", "label": "x"})(),),
        )
        entry = next(e for e in runner.CATALOGUE if e.name == "baseline")
        assert runner._ask_for(entry) is None


class TestComponentCoverage:
    """Cover the component space and let a generic render check find what is wrong."""

    def test_the_universe_comes_from_the_schemas_in_this_repo(self):
        from benchmarks import components

        universe = components.universe()
        assert len(universe) > 40, "the component schemas were not found"
        assert "Datepicker" in universe
        assert "FileUpload" in universe
        assert "FileUploadWithTag" not in universe
        assert "LikertItem" not in universe
        assert not any(name.startswith("common-defs") for name in universe)

    def test_it_reports_what_the_items_exercise(self):
        from benchmarks import components

        coverage = components.collect()
        assert coverage.exercised
        assert set(coverage.exercised) <= set(coverage.universe)
        assert set(coverage.never_exercised).isdisjoint(coverage.exercised)

    def test_a_component_exercised_only_by_a_replay_is_flagged(self):
        """The shape of the defect that shipped: scored by a replay, never rendered."""
        from benchmarks import components

        coverage = components.Coverage(
            universe=("Datepicker", "Input"),
            by_dataset={"Loop/traces": ("Datepicker", "Input")},
            unavailable=("Benchmarks/forms",),
        )
        assert coverage.rendered == ()
        assert coverage.replay_only == ("Datepicker", "Input")
        lines = "\n".join(components.render(coverage))
        assert "exercised but never rendered" in lines
        assert "no run loads the page" in lines

    def test_a_rendered_component_is_not_flagged(self):
        from benchmarks import components

        coverage = components.Coverage(
            universe=("Datepicker",),
            by_dataset={"Benchmarks/forms": ("Datepicker",)},
            unavailable=(),
        )
        assert coverage.rendered == ("Datepicker",)
        assert coverage.replay_only == ()

    def test_it_says_when_the_only_rendering_eval_has_no_items_here(self):
        from benchmarks import components

        lines = "\n".join(components.render(components.collect()))
        assert "Benchmarks/forms has no items in the repo" in lines
        assert "the only kind that renders" in lines

    def test_no_schemas_degrades_rather_than_crashing(self, monkeypatch):
        from benchmarks import components

        monkeypatch.setattr(components, "LAYOUT_SCHEMA_PATH", pathlib_path_that_does_not_exist())
        assert components.universe() == ()
        coverage = components.Coverage(universe=(), by_dataset={}, unavailable=())
        assert "cannot be computed" in components.render(coverage)[0]

    def test_new_components_are_discovered_from_the_layout_contract(self, monkeypatch, tmp_path):
        from benchmarks import components

        schema_path = tmp_path / "layout.schema.v1.json"
        schema_path.write_text(
            json.dumps({"definitions": {"AnyComponent": {"properties": {"type": {"enum": ["Input", "NewComponent"]}}}}})
        )
        monkeypatch.setattr(components, "LAYOUT_SCHEMA_PATH", schema_path)
        assert components.universe() == ("Input", "NewComponent")


def pathlib_path_that_does_not_exist():
    from pathlib import Path

    return Path("/nonexistent-component-schemas")


class TestTheOutputStaysReadable:
    """A seven-eval run printed hundreds of SDK lines, so a real failure scrolled
    past and the run looked hung."""

    def _record(self, name, message):
        import logging

        return logging.LogRecord(name, logging.ERROR, __file__, 1, message, None, None)

    def test_the_event_loop_noise_is_dropped(self):
        from benchmarks import quiet

        quiet.apply()
        dropped = self._record(
            "asyncio",
            "Task exception was never retrieved\nfuture: <Task finished "
            "coro=<AsyncClient.aclose()> exception=RuntimeError('Event loop is closed')>",
        )
        assert not all(f.filter(dropped) for f in __import__("logging").getLogger("asyncio").filters)

    def test_the_tracer_provider_and_span_context_noise_is_dropped(self):
        import logging

        from benchmarks import quiet

        quiet.apply()
        for name, message in (
            ("opentelemetry.trace", "Overriding of current TracerProvider is not allowed"),
            ("langfuse", "Context error: No active span in current context."),
        ):
            record = self._record(name, message)
            assert not logging.getLogger(name).filter(record), name

    def test_the_attribute_length_warning_is_dropped(self):
        import logging

        from benchmarks import quiet

        quiet.apply()
        dropped = self._record(
            "langfuse",
            "Propagated attribute 'experiment_item_metadata.note' value is over 200 "
            "characters (207 chars). Dropping value.",
        )
        assert not logging.getLogger("langfuse").filter(dropped)

    def test_a_real_error_from_those_loggers_still_prints(self):
        import logging

        from benchmarks import quiet

        quiet.apply()
        for name, message in (
            ("asyncio", "some other asyncio failure"),
            ("langfuse", "authentication failed"),
        ):
            record = self._record(name, message)
            assert logging.getLogger(name).filter(record), name

    def test_applying_twice_does_not_stack_filters(self):
        import logging

        from benchmarks import quiet

        quiet.apply()
        before = len(logging.getLogger("asyncio").filters)
        quiet.apply()
        assert len(logging.getLogger("asyncio").filters) == before


def test_documentation_beside_a_prompt_is_not_a_prompt():
    """`agents/prompts/*` matched the README and the loader, so a docs-only change
    was told to re-baseline."""
    for path in ("src/AI/assistant/agents/prompts/README.md", "src/AI/assistant/agents/prompts/loader.py"):
        assert impact.analyze([path]).hits == ()


def test_a_prompt_itself_still_moves_the_axis():
    hits = impact.analyze(["src/AI/assistant/agents/prompts/scope_check.md"]).hits

    assert [h.axis for h in hits] == ["prompts"]


def test_a_judge_prompt_in_a_subdirectory_still_moves_the_axis():
    hits = impact.analyze(["src/AI/assistant/agents/prompts/llm-as-a-judge/x.md"]).hits

    assert [h.axis for h in hits] == ["prompts"]


def test_the_gate_writes_the_error_of_a_failed_digest(monkeypatch, capsys):
    """Without the error, the job log does not say why the digest failed."""
    from benchmarks import provenance

    def fail():
        raise ImportError("cannot import name '_build_registry'")

    monkeypatch.setitem(provenance.DIGEST_HASHERS, "tools", fail)

    measured = provenance.digests(on_failure=impact.print_digest_failure)

    error = capsys.readouterr().err
    assert measured["tools"] is None
    assert "The tools digest failed:" in error
    assert "ImportError: cannot import name '_build_registry'" in error


def test_the_file_list_can_arrive_on_stdin(monkeypatch, capsys):
    """xargs split a long list across several runs, so each saw part of the change."""
    import io

    monkeypatch.setattr("sys.argv", ["impact", "--strict"])
    monkeypatch.setattr(impact, "git_reader", lambda _against: None)
    monkeypatch.setattr("sys.stdin", io.StringIO("src/AI/assistant/benchmarks/gates.py\n"))

    assert impact._main() == 1
    assert "evaluators" in capsys.readouterr().out


def test_the_gate_reads_old_files_at_the_given_base_ref(monkeypatch):
    """The gate must not compare a pull request that targets another branch with main."""
    import io

    used = []
    monkeypatch.setattr("sys.argv", ["impact", "--strict", "--against", "feature-a"])
    monkeypatch.setattr(impact, "git_reader", lambda against: used.append(against))
    monkeypatch.setattr("sys.stdin", io.StringIO("src/AI/assistant/README.md\n"))

    impact._main()

    assert used == ["feature-a"]


def test_the_gate_reads_old_files_at_origin_main_by_default(monkeypatch):
    import io

    used = []
    monkeypatch.setattr("sys.argv", ["impact"])
    monkeypatch.setattr(impact, "git_reader", lambda against: used.append(against))
    monkeypatch.setattr("sys.stdin", io.StringIO("src/AI/assistant/README.md\n"))

    impact._main()

    assert used == [impact.DEFAULT_BASE_REF]


class TestOnlyACodeChangeMovesAnAxis:
    """A docstring, a comment or a format change must not require a check."""

    PATH = "agents/core/tools/file_tool.py"
    SOURCE = '''\
"""Module docstring."""

from pydantic import BaseModel


class Args(BaseModel):
    """Pydantic copies this text into the input schema."""

    path: str


def run(args):
    """Function docstring."""
    return args.path  # a comment
'''

    def _analyze(self, new_source: str | None, old_source: str | None = SOURCE):
        return impact.analyze(
            [self.PATH],
            before=lambda _path: old_source,
            after=lambda _path: new_source,
        )

    def test_a_module_docstring_change_moves_no_axis(self):
        found = self._analyze(self.SOURCE.replace("Module docstring.", "New text."))
        assert found.hits == ()
        assert found.docs_only == (self.PATH,)
        assert any(self.PATH in line for line in found.explain())

    def test_a_function_docstring_change_moves_no_axis(self):
        assert self._analyze(self.SOURCE.replace("Function docstring.", "New text.")).hits == ()

    def test_a_removed_function_docstring_moves_no_axis(self):
        assert self._analyze(self.SOURCE.replace('    """Function docstring."""\n', "")).hits == ()

    def test_a_comment_or_format_change_moves_no_axis(self):
        changed = self.SOURCE.replace("  # a comment", "").replace("return args.path", "return (args.path)")
        assert self._analyze(changed).hits == ()

    def test_a_class_docstring_change_moves_the_axis(self):
        """Pydantic copies a class docstring into the tool's input schema."""
        found = self._analyze(self.SOURCE.replace("Pydantic copies this text into the input schema.", "New text."))
        assert found.axes == ("code",)

    def test_a_code_change_moves_the_axis(self):
        found = self._analyze(self.SOURCE.replace("return args.path", "return args"))
        assert found.axes == ("code",)

    def test_a_new_file_moves_the_axis(self):
        assert self._analyze(self.SOURCE, old_source=None).axes == ("code",)

    def test_a_deleted_file_moves_the_axis(self):
        assert self._analyze(None).axes == ("code",)

    def test_a_file_that_does_not_parse_moves_the_axis(self):
        assert self._analyze(self.SOURCE + "def (:\n").axes == ("code",)

    def test_a_docstring_change_in_a_behavior_file_needs_no_check(self):
        found = impact.analyze(
            ["agents/core/loop.py"],
            before=lambda _path: '"""Old."""\n',
            after=lambda _path: '"""New."""\n',
        )
        assert not found.needs_check

    def test_the_gate_never_compares_a_markdown_file_as_code(self):
        found = impact.analyze(
            ["agents/prompts/scope_check.md"],
            before=lambda _path: "same",
            after=lambda _path: "same",
        )
        assert found.axes == ("prompts",)

    def test_the_git_reader_reads_the_file_at_the_merge_base(self):
        read = impact.git_reader("HEAD")
        assert read is not None
        assert read("benchmarks/impact.py") is not None
        assert read("benchmarks/no_such_file.py") is None

    def test_an_unknown_base_ref_gives_no_reader(self):
        assert impact.git_reader("no-such-ref-for-this-test") is None
