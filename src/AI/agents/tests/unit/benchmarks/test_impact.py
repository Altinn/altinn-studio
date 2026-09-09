"""Which files move which axis."""

from __future__ import annotations

from pathlib import Path

from benchmarks import impact

AGENTS_ROOT = Path(__file__).resolve().parents[3]


def test_a_dataset_edit_invalidates_the_baseline():
    found = impact.analyze(["benchmarks/datasets/gates_scope.jsonl"])
    assert found.needs_rebaseline
    assert found.axes == ("dataset",)
    assert any("not comparable" in line for line in found.explain())


def test_the_actor_prompt_invalidates_the_baseline():
    """It is not a Langfuse prompt, so only a path rule catches a change to it."""
    found = impact.analyze(["agents/core/context.py"])
    assert found.needs_rebaseline
    assert found.axes == ("actor_prompt",)


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


def test_a_tool_change_invalidates_the_baseline():
    for path in ("agents/core/tools/file_tool.py", "agents/core/registry.py"):
        found = impact.analyze([path])
        assert found.needs_rebaseline, path
        assert found.axes == ("tools",), path


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
    a = impact.analyze(["src/AI/agents/benchmarks/datasets/gates_scope.jsonl"])
    b = impact.analyze(["benchmarks/datasets/gates_scope.jsonl"])
    assert a.axes == b.axes == ("dataset",)


def test_a_yardstick_change_wins_over_a_behavior_change_on_the_same_path():
    """`agents/core/context.py` matches both rule sets, and the stronger one applies."""
    found = impact.analyze(["agents/core/context.py"])
    assert found.yardstick_hits and not found.behavior_hits


def test_both_kinds_are_reported_when_both_are_present():
    found = impact.analyze(["benchmarks/datasets/x.jsonl", "agents/core/loop.py"])
    assert found.needs_rebaseline
    assert found.yardstick_hits and found.behavior_hits


def test_every_declared_pattern_matches_something_that_exists():
    """A rule for a path that is gone is a rule that silently stops working."""
    for pattern, _axis, _why in impact.YARDSTICK + impact.BEHAVIOR:
        base = pattern.rstrip("/*")
        target = AGENTS_ROOT / base
        assert target.exists(), f"{pattern} matches nothing in the repo any more"


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
        _code, text = self._run_impact(["agents/core/context.py"], tmp_path)
        assert "runner check --label" in text
        assert "runner baseline <check id> --why" in text
        assert "commit benchmarks/BASELINE.json" in text
        assert "workbench.html" in text, "reading the report is part of the instruction"

    def test_the_failure_offers_the_other_answer(self, tmp_path):
        """Sometimes the right fix is to not change the yardstick."""
        _code, text = self._run_impact(["benchmarks/outputs.py"], tmp_path)
        assert "did not mean to change the yardstick" in text

    def test_a_change_carrying_a_new_pointer_passes(self, tmp_path):
        code, text = self._run_impact(
            ["benchmarks/datasets/gates_scope.jsonl", "benchmarks/BASELINE.json"], tmp_path
        )
        assert code == 0
        assert "travels with it" in text

    def test_a_behavior_change_passes(self, tmp_path):
        code, _text = self._run_impact(["agents/core/loop.py"], tmp_path)
        assert code == 0

    def test_without_strict_it_reports_and_does_not_fail(self, tmp_path):
        """So a developer can ask before pushing without the command exiting non-zero."""
        code, text = self._run_impact(
            ["benchmarks/datasets/gates_scope.jsonl"], tmp_path, strict=False
        )
        assert code == 0
        assert "INVALIDATES THE BASELINE" in text


class TestTheGateRunsWithoutDependencies:
    """CI installs nothing, so a broken dependency cannot silence the one gate
    that always runs. That only holds while this module stays stdlib only."""

    def test_impact_and_baseline_import_nothing_third_party(self):
        import ast

        allowed = {
            "fnmatch", "dataclasses", "json", "pathlib", "subprocess", "sys",
            "benchmarks", "__future__",
        }
        for name in ("impact", "baseline"):
            source = (AGENTS_ROOT / "benchmarks" / f"{name}.py").read_text()
            for node in ast.walk(ast.parse(source)):
                if isinstance(node, ast.Import):
                    roots = [alias.name.split(".")[0] for alias in node.names]
                elif isinstance(node, ast.ImportFrom):
                    roots = [(node.module or "").split(".")[0]]
                else:
                    continue
                for root in roots:
                    assert root in allowed, f"{name}.py imports {root!r}, which CI does not install"

    def test_the_module_is_runnable_as_a_script(self):
        from benchmarks import impact

        assert hasattr(impact, "report")
        assert hasattr(impact, "_main")

    def test_the_runner_and_the_gate_share_one_report(self):
        """Two copies of this message would drift, and only one of them is tested."""
        source = (AGENTS_ROOT / "benchmarks" / "runner.py").read_text()
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
        actions = [
            a for a in parser._actions if a.__class__.__name__ == "_SubParsersAction"
        ]
        assert actions, "the parser has no subcommands"
        assert set(actions[0].choices) == {e.name for e in runner.CATALOGUE}

    def test_help_text_comes_from_the_catalogue(self):
        from benchmarks import runner

        for entry in runner.CATALOGUE:
            assert runner._describe(entry.name) == entry.does

    def test_the_menu_does_not_block_when_stdin_is_not_a_terminal(self, monkeypatch, capsys):
        """CI and pipes must get the list and an exit, never a prompt that waits."""
        from benchmarks import runner

        monkeypatch.setattr("sys.stdin.isatty", lambda: False)
        monkeypatch.setattr(
            "builtins.input", lambda *_: pytest.fail("the menu prompted without a terminal")
        )
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
        assert "FileUploadWithTag" in universe
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

        monkeypatch.setattr(components, "SCHEMA_DIR", pathlib_path_that_does_not_exist())
        assert components.universe() == ()
        coverage = components.Coverage(universe=(), by_dataset={}, unavailable=())
        assert "cannot be computed" in components.render(coverage)[0]


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
            assert not all(f.filter(record) for f in logging.getLogger(name).filters), name

    def test_the_attribute_length_warning_is_dropped(self):
        import logging

        from benchmarks import quiet

        quiet.apply()
        dropped = self._record(
            "langfuse",
            "Propagated attribute 'experiment_item_metadata.note' value is over 200 "
            "characters (207 chars). Dropping value.",
        )
        assert not all(f.filter(dropped) for f in logging.getLogger("langfuse").filters)

    def test_a_real_error_from_those_loggers_still_prints(self):
        import logging

        from benchmarks import quiet

        quiet.apply()
        for name, message in (
            ("asyncio", "some other asyncio failure"),
            ("langfuse", "authentication failed"),
        ):
            record = self._record(name, message)
            assert all(f.filter(record) for f in logging.getLogger(name).filters), name

    def test_applying_twice_does_not_stack_filters(self):
        import logging

        from benchmarks import quiet

        quiet.apply()
        before = len(logging.getLogger("asyncio").filters)
        quiet.apply()
        assert len(logging.getLogger("asyncio").filters) == before
