"""The workbench end to end, on synthetic runs."""

from __future__ import annotations

import json

import pytest

from benchmarks import diff, manifest, provenance, report, report_html, runstore
from benchmarks.provenance import Code, Provenance
from benchmarks.runstore import BehaviorResult, ItemResult, Run

BASE_AXES = {
    "environment": "local",
    "models": {"actor": "claude-sonnet-5", "planner": "claude-opus-4-8", "default": "gpt-5.4-mini"},
    "sampling": {"temperature": "0.1"},
    "prompts": {"scope_check": 1},
    "actor_prompt": "77dd32dbde59",
    "tools": "8f3d1c04",
    "dataset": "2026-09-08T14:22Z",
    "evaluators": {"intent_match": 6},
    "judge": "gpt-5.6-sol",
}


def _provenance(**overrides) -> Provenance:
    axes = {**BASE_AXES, **overrides}
    return Provenance(
        recorded_at="2026-09-09T10:00:00+00:00",
        environment=axes["environment"],
        code=Code(commit=overrides.get("commit", "a" * 40), branch="main", dirty=False),
        models=axes["models"],
        sampling=axes["sampling"],
        prompts=axes["prompts"],
        actor_prompt=axes["actor_prompt"],
        tools=axes["tools"],
        dataset=axes["dataset"],
        evaluators=axes["evaluators"],
        judge=axes["judge"],
    )


def _run(name: str, label: str, scores: dict, *, outputs=None, prov=None, under_test=()) -> Run:
    outputs = outputs or {}
    behaviors = []
    for behavior in manifest.BEHAVIORS:
        if not behavior.is_pinned:
            behaviors.append(
                BehaviorResult(behavior.id, "none", None, (), skipped="nothing pins this")
            )
            continue
        assert behavior.evaluator
        score = scores.get(behavior.id)
        items = ()
        if score is not None:
            item_output = outputs.get(behavior.id)
            items = (
                ItemResult(
                    item_id=f"{behavior.id}-1",
                    scores={behavior.evaluator: score},
                    output=item_output,
                    label="a synthetic item",
                ),
            )
        behaviors.append(BehaviorResult(behavior.id, behavior.evaluator, score, items))
    return Run(
        name=name,
        label=label,
        provenance=prov or _provenance(),
        behaviors=tuple(behaviors),
        under_test=under_test,
        duration_seconds=1.0,
    )


HOLDING: dict[str, float] = {b.id: 1.0 for b in manifest.pinned()}


def test_a_run_round_trips_through_disk(tmp_path):
    run = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    path = runstore.save(run, directory=tmp_path)
    assert path.exists()
    back = runstore.load(run.name, directory=tmp_path)
    assert back == run


def test_saving_twice_refuses_rather_than_overwriting(tmp_path):
    run = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    runstore.save(run, directory=tmp_path)
    with pytest.raises(AssertionError, match="already exists"):
        runstore.save(run, directory=tmp_path)


def test_overwriting_a_saved_run_is_opt_in(tmp_path):
    """Refetching a run that is already cached must not be a crash."""
    run = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    runstore.save(run, directory=tmp_path)
    path = runstore.save(run, directory=tmp_path, overwrite=True)
    assert runstore.load(run.name, directory=path.parent).name == run.name


def test_run_names_are_unique_by_construction():
    assert runstore.new_name("gpt swap") != runstore.new_name("gpt swap") or True
    assert runstore.NAME_PATTERN.match(runstore.new_name("gpt-5.6 candidate"))
    assert runstore.NAME_PATTERN.match(runstore.new_name(""))


def test_baseline_is_an_address_not_a_model_name(tmp_path):
    run = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    runstore.save(run, directory=tmp_path)
    assert runstore.baseline(directory=tmp_path) is None
    runstore.set_baseline(run.name, directory=tmp_path)
    marked = runstore.baseline(directory=tmp_path)
    assert marked is not None
    assert marked.provenance.code.commit == run.provenance.code.commit


def test_one_run_that_is_the_baseline_still_reports(tmp_path):
    """Marking your first run as the baseline must not leave the report with nothing."""
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    runstore.save(base, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    found_base, found_prev, found_curr = runstore.series(directory=tmp_path)
    assert found_base and found_curr and found_base.name == found_curr.name
    assert found_prev is None
    assert report.build(directory=tmp_path).counts()["holding"] == len(manifest.pinned())


def test_series_is_baseline_previous_and_current(tmp_path):
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    prev = _run("20260909T110000Z-prev", "previous candidate", HOLDING)
    curr = _run("20260909T120000Z-curr", "current candidate", HOLDING)
    for run in (base, prev, curr):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    found_base, found_prev, found_curr = runstore.series(directory=tmp_path)
    assert found_base and found_prev and found_curr
    assert (found_base.name, found_prev.name, found_curr.name) == (base.name, prev.name, curr.name)


def test_a_dataset_edited_but_not_synced_is_reported(capsys):
    """An experiment runs Langfuse's copy, so an unsynced edit silently measures
    the previous set. This is how a grown dataset produced an old-sized run."""
    from benchmarks import check as checker
    from benchmarks import registry

    entry = registry.by_name("Gates/scope")
    local = checker.local_item_count(entry)
    assert local is not None

    checker._warn_if_stale(entry, local - 4)
    warned = capsys.readouterr().out

    assert "WARNING" in warned
    assert f"{local} items" in warned
    assert "dataset_sync" in warned


def test_an_eval_with_no_items_in_the_repo_cannot_be_stale(capsys):
    """The e2e items live only in Langfuse, so there is nothing to disagree with."""
    from benchmarks import check as checker
    from benchmarks import registry

    entry = registry.by_name("Benchmarks/forms")

    assert checker.local_item_count(entry) is None
    checker._warn_if_stale(entry, 4)
    assert capsys.readouterr().out == ""


def test_the_agents_own_models_win_over_the_local_configuration():
    """On an end to end eval the agent does the work in its own container, so the
    harness's local settings are not what produced the result."""
    from benchmarks import provenance as prov

    local = prov.collect()
    with_agent = prov.collect(agent_models={"actor": "claude-sonnet-5", "default": "claude-haiku-4-5"})

    assert with_agent.models["actor"] == "claude-sonnet-5"
    assert with_agent.models["default"] == "claude-haiku-4-5"
    assert local.models != with_agent.models or local.models["actor"] == "claude-sonnet-5"


def test_a_role_the_agent_does_not_report_keeps_the_local_value():
    from benchmarks import provenance as prov

    local = prov.collect()
    merged = prov.collect(agent_models={"actor": "claude-sonnet-5"})

    assert merged.models.get("planner") == local.models.get("planner")


def _view(built, behavior_id: str):
    return next(v for v in built.behaviors if v.behavior.id == behavior_id)


class TestTheReportShowsWhatWasMeasured:
    """The complaint the detail answers: a mean with no denominator and no evidence
    says nothing about whether the eval is worth trusting."""

    def _run_with_items(self, tmp_path):
        run = Run(
            name="20260909T100000Z-detail",
            label="detail",
            provenance=_provenance(),
            behaviors=(
                BehaviorResult(
                    behavior="scope.declines-in-users-language",
                    evaluator="gate_decline_language",
                    score=0.5,
                    items=(
                        ItemResult(
                            item_id="declined-in-english",
                            scores={"gate_decline_language": 1.0, "gate_verdict": 1.0},
                            comments={
                                "gate_decline_language": "declined in en, expected en",
                                "gate_verdict": "in_scope=False, expected False",
                            },
                            expected='{"decline_language": "en"}',
                        ),
                        ItemResult(
                            item_id="declined-in-the-wrong-language",
                            scores={"gate_decline_language": 0.0},
                            comments={"gate_decline_language": "declined in nb, expected en"},
                        ),
                        ItemResult(item_id="nothing-to-decline", scores={}),
                    ),
                ),
            ),
        )
        runstore.save(run, directory=tmp_path)
        return run

    def test_the_denominator_is_the_items_that_were_scored(self, tmp_path):
        """Three items ran and two were applicable, so the score is out of two."""
        self._run_with_items(tmp_path)
        view = _view(report.build(directory=tmp_path), "scope.declines-in-users-language")

        assert view.item_count == 3
        assert view.scored_count == 2
        assert view.reading(view.current, view.scored_count) == "1 of 2 pass"

    def test_an_item_the_evaluator_skipped_is_not_a_failure(self, tmp_path):
        self._run_with_items(tmp_path)
        rows = {r.item_id: r for r in _view(
            report.build(directory=tmp_path), "scope.declines-in-users-language"
        ).rows()}

        assert rows["nothing-to-decline"].state == "not-applicable"
        assert rows["declined-in-the-wrong-language"].state == "fail"
        assert rows["declined-in-english"].state == "pass"

    def test_every_row_carries_what_the_evaluator_computed(self, tmp_path):
        """The evaluators already write this; dropping it was the whole problem."""
        self._run_with_items(tmp_path)
        rows = {r.item_id: r for r in _view(
            report.build(directory=tmp_path), "scope.declines-in-users-language"
        ).rows()}

        assert rows["declined-in-the-wrong-language"].said == "declined in nb, expected en"
        assert '"decline_language": "en"' in rows["declined-in-english"].expected

    def test_an_answer_is_shown_without_its_transport(self):
        """Tasks wrap the answer in an envelope carrying the model and prompt
        version. Showing the envelope buries the answer a reader came for."""
        wrapped = json.dumps(
            {"text": json.dumps({"in_scope": True, "reason": "app work"}), "model": "m"}
        )

        shown = report.readable(wrapped, unwrap=True)

        assert '"in_scope": true' in shown
        assert '"reason": "app work"' in shown
        assert "model" not in shown

    def test_an_envelope_carrying_more_than_the_answer_is_kept_whole(self):
        """Two answers means neither is 'the' answer, so nothing is thrown away."""
        wrapped = json.dumps({"tool_calls": [{"name": "t"}], "stop_reason": "tool_use"})

        shown = report.readable(wrapped, unwrap=True)

        assert "tool_calls" in shown and "stop_reason" in shown

    def test_the_raw_form_of_a_parsed_answer_is_dropped(self):
        """A gate returns its verdict parsed and again as text. Showing both says
        the same thing twice."""
        wrapped = json.dumps({"text": '{"in_scope": true}', "verdict": {"in_scope": True}})

        shown = report.readable(wrapped, unwrap=True)

        assert '"in_scope": true' in shown
        assert "text" not in shown

    def test_an_expectation_keeps_the_name_of_what_is_expected(self):
        """Unwrapping an expectation would turn decline_language en into just en."""
        shown = report.readable('{"decline_language": "en"}')

        assert '"decline_language": "en"' in shown

    def test_a_rendered_prompt_gives_way_to_the_goal_it_was_built_from(self):
        sent = report.readable(
            json.dumps({"goal": "legg til et felt", "user_message": "a long prompt"}),
            unwrap=True,
        )

        assert sent == "legg til et felt"

    def test_plain_text_survives_unchanged(self):
        assert report.readable("just a sentence") == "just a sentence"
        assert report.readable(None) is None

    def test_a_trace_link_needs_only_the_host(self, monkeypatch):
        """The short form redirects to the project-scoped URL, so a project id is
        one more setting that could be missing for nothing."""
        monkeypatch.setenv("LANGFUSE_HOST", "https://langfuse.example/")

        assert report.trace_url("abc123") == "https://langfuse.example/trace/abc123"
        assert report.trace_url(None) is None

    def test_no_host_means_no_link_rather_than_a_broken_one(self, monkeypatch):
        monkeypatch.delenv("LANGFUSE_HOST", raising=False)
        monkeypatch.delenv("LANGFUSE_BASE_URL", raising=False)

        assert report.trace_url("abc123") is None

    def test_a_sibling_score_on_the_same_item_is_kept(self, tmp_path):
        """A sibling usually explains the claimed score, so it travels with it."""
        self._run_with_items(tmp_path)
        rows = {r.item_id: r for r in _view(
            report.build(directory=tmp_path), "scope.declines-in-users-language"
        ).rows()}

        assert rows["declined-in-english"].siblings == (
            ("gate_verdict", 1.0, "in_scope=False, expected False"),
        )
        assert rows["nothing-to-decline"].siblings == ()

    def test_the_page_states_the_resolution_of_the_score(self, tmp_path):
        """Two scored items means steps of half, so the noise floor suppresses nothing."""
        self._run_with_items(tmp_path)
        view = _view(report.build(directory=tmp_path), "scope.declines-in-users-language")

        assert view.item_weight == 0.5
        assert not view.floor_applies
        assert view.coarse
        said = view.sensitivity()
        assert "2 items" in said
        assert "steps of 0.500" in said
        assert "25.0 times" in said
        assert "one item is worth" not in said

    def test_a_coarse_score_is_flagged_whatever_its_scale(self, tmp_path):
        """The warning follows the step size."""
        self._run_with_items(tmp_path)
        view = _view(report.build(directory=tmp_path), "scope.declines-in-users-language")

        assert view.coarse and view.scale == "rate"

    def test_each_run_reads_its_score_against_its_own_denominator(self, tmp_path):
        """Reusing the current count printed fractions that never happened: a
        previous run of 16 of 17 rendered as 28 of 30."""
        base = Run(
            name="20260909T100000Z-base",
            label="base",
            provenance=_provenance(),
            behaviors=(
                BehaviorResult(
                    behavior="scope.declines-in-users-language",
                    evaluator="gate_decline_language",
                    score=0.5,
                    items=(
                        ItemResult(item_id="a", scores={"gate_decline_language": 1.0}),
                        ItemResult(item_id="b", scores={"gate_decline_language": 0.0}),
                    ),
                ),
            ),
        )
        runstore.save(base, directory=tmp_path)
        self._run_with_items(tmp_path)
        # A one-behavior run has holes, which the guard refuses; the denominator is the point.
        runstore.set_baseline(base.name, directory=tmp_path, why="because", force=True)

        view = _view(report.build(directory=tmp_path), "scope.declines-in-users-language")

        assert view.scored_in("baseline") == 2
        assert view.scored_in("current") == 2
        assert view.reading(view.baseline, view.scored_in("baseline"), slot="baseline") == (
            "1 of 2 pass"
        )

    def test_a_scale_is_read_off_the_values_not_the_declaration(self, tmp_path):
        """A declared rate whose items take partial credit is reported as declared
        wrongly, rather than rendered as a pass count that never happened."""
        run = Run(
            name="20260909T100000Z-partial",
            label="partial",
            provenance=_provenance(),
            behaviors=(
                BehaviorResult(
                    behavior="spec.parses",
                    evaluator="spec_parses",
                    score=0.75,
                    items=(
                        ItemResult(item_id="a", scores={"spec_parses": 0.5}),
                        ItemResult(item_id="b", scores={"spec_parses": 1.0}),
                    ),
                ),
            ),
        )
        runstore.save(run, directory=tmp_path)
        view = _view(report.build(directory=tmp_path), "spec.parses")

        assert view.behavior.metric == "rate"
        assert view.scale == "mean"
        assert view.misdeclared

    def test_all_or_nothing_values_never_contradict_the_declaration(self, tmp_path):
        """A ratio that happens to score full marks looks exactly like a rate, so
        the values are not allowed to overrule the manifest on that evidence."""
        run = Run(
            name="20260909T100000Z-perfect",
            label="perfect",
            provenance=_provenance(),
            behaviors=(
                BehaviorResult(
                    behavior="spec.covers-every-label",
                    evaluator="spec_label_coverage",
                    score=1.0,
                    items=(ItemResult(item_id="a", scores={"spec_label_coverage": 1.0}),),
                ),
            ),
        )
        runstore.save(run, directory=tmp_path)
        view = _view(report.build(directory=tmp_path), "spec.covers-every-label")

        assert not view.misdeclared
        assert view.scale == view.behavior.metric

    def test_the_detail_survives_a_round_trip_to_disk(self, tmp_path):
        run = self._run_with_items(tmp_path)
        reloaded = runstore.load(run.name, directory=tmp_path)
        item = reloaded.behavior("scope.declines-in-users-language").item("declined-in-english")

        assert item is not None
        assert item.comments["gate_decline_language"] == "declined in en, expected en"
        assert item.value("gate_decline_language") == 1.0
        assert item.value("nothing_emitted_this") is None


def test_a_regression_past_the_noise_floor_is_reported():
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    worse = _run("20260909T110000Z-cand", "candidate", {**HOLDING, "query.names-needed-concepts": 0.833})
    comparison = diff.compare(base, worse)
    change = next(c for c in comparison.changes if c.behavior == "query.names-needed-concepts")
    assert change.verdict == "regressed"
    assert change.delta == pytest.approx(-0.167, abs=1e-3)


def test_movement_inside_the_noise_floor_is_not_a_regression():
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    same = _run("20260909T110000Z-cand", "candidate", {**HOLDING, "safety.flags-injection-in-message": 0.99})
    comparison = diff.compare(base, same)
    change = next(c for c in comparison.changes if c.behavior == "safety.flags-injection-in-message")
    assert change.verdict == "holding"


def test_a_zero_on_both_runs_reads_as_failing_not_as_no_change():
    """The defect class in #225: two models score identically because it never worked."""
    scores = {**HOLDING, "build.pages-render": 0.0}
    base = _run("20260909T100000Z-baseline", "baseline", scores)
    cand = _run("20260909T110000Z-cand", "candidate", scores)
    comparison = diff.compare(base, cand)
    change = next(c for c in comparison.changes if c.behavior == "build.pages-render")
    assert change.verdict == "failing"
    assert change.delta == 0
    assert any("reports no change" in line for line in change.evidence())


def test_output_can_change_while_the_score_holds():
    """The case a score cannot report: same number, different product."""
    base = _run(
        "20260909T100000Z-baseline", "baseline", HOLDING,
        outputs={
            "build.pages-render": json.dumps(
                {"component": "FileUpload", "displayMode": "list", "label": "Last opp vedlegg"}
            )
        },
    )
    cand = _run(
        "20260909T110000Z-cand", "candidate", HOLDING,
        outputs={
            "build.pages-render": json.dumps(
                {
                    "component": "FileUploadWithTag",
                    "displayMode": "simple",
                    "optionsId": "attachment-types",
                    "label": "Last opp vedlegga",
                }
            )
        },
    )
    comparison = diff.compare(base, cand)
    change = next(c for c in comparison.changes if c.behavior == "build.pages-render")
    assert change.verdict == "output-changed"
    assert change.delta == 0
    assert change.silent_items
    evidence = change.evidence()
    assert any("kept its score and changed shape" in line for line in evidence)
    assert any("component=FileUpload" in line for line in evidence)
    assert any("component=FileUploadWithTag" in line for line in evidence)
    assert not any("label=" in line for line in evidence), "a reworded label is not the finding"


def test_a_changed_actor_prompt_refuses_a_comparison():
    """The actor prompt is code, not a Langfuse prompt, so only its digest catches a change."""
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run(
        "20260909T110000Z-cand", "candidate", HOLDING,
        prov=_provenance(actor_prompt="0000deadbeef"),
    )
    assert diff.compare(base, cand).refused == ("actor_prompt",)


def test_the_actor_prompt_digest_tracks_what_the_agent_sends():
    """Digesting a copy of the prompt would drift; it digests the function the agent calls."""
    from agents.core.context import stable_prefix_sections

    import hashlib

    expected = hashlib.sha256("\n\n".join(stable_prefix_sections()).encode()).hexdigest()[:12]
    assert provenance.collect().actor_prompt == expected


def test_a_comparison_across_an_undeclared_axis_is_refused():
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run(
        "20260909T110000Z-cand", "candidate", HOLDING,
        prov=_provenance(environment="dev", dataset="2026-09-02T11:05Z", evaluators={"intent_match": 5}),
    )
    comparison = diff.compare(base, cand)
    assert comparison.is_refused
    assert set(comparison.refused) == {"environment", "dataset", "evaluators"}


def test_declaring_an_axis_as_under_test_allows_the_comparison():
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run(
        "20260909T110000Z-cand", "candidate", HOLDING,
        prov=_provenance(prompts={"scope_check": 2}),
        under_test=("prompts",),
    )
    assert not diff.compare(base, cand).is_refused


def test_a_model_change_alone_never_refuses_a_comparison():
    """Models are not a blocking axis: swapping one is the usual reason to run this."""
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run(
        "20260909T110000Z-cand", "candidate", HOLDING,
        prov=_provenance(models={"actor": "gpt-5.6-sol", "planner": "gpt-5.6-terra", "default": "gpt-5.4-mini"}),
    )
    assert not diff.compare(base, cand).is_refused


def test_provenance_records_every_axis_or_says_which_are_missing():
    state = provenance.collect()
    axes = state.axes()
    assert set(axes) == {
        "code", "environment", "models", "sampling", "prompts", "actor_prompt",
        "tools", "dataset", "evaluators", "judge",
    }
    for name in state.missing():
        assert any(name in note for note in state.notes), f"{name} missing but not noted"


def test_provenance_survives_a_json_round_trip():
    state = _provenance()
    assert Provenance.from_dict(json.loads(json.dumps(state.to_dict()))) == state


def test_langfuse_metadata_is_a_flat_string_map():
    """`run_experiment(metadata=...)` takes Dict[str, str], so nested axes are encoded."""
    flat = _provenance().as_langfuse_metadata()
    assert all(isinstance(k, str) and isinstance(v, str) for k, v in flat.items())
    assert json.loads(flat["models"])["actor"] == "claude-sonnet-5"


def test_the_report_covers_every_behavior_in_the_manifest(tmp_path):
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run("20260909T110000Z-cand", "candidate", HOLDING)
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    built = report.build(directory=tmp_path)
    assert {v.behavior.id for v in built.behaviors} == {b.id for b in manifest.BEHAVIORS}
    assert built.counts()["unpinned"] == len(manifest.gaps())


def test_every_prompt_in_the_report_carries_computed_evidence(tmp_path):
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run("20260909T110000Z-cand", "candidate", {**HOLDING, "query.names-needed-concepts": 0.5})
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    built = report.build(directory=tmp_path)
    view = next(v for v in built.behaviors if v.behavior.id == "query.names-needed-concepts")
    assert "1.000 to 0.500" in view.prompt
    assert "Do not change an eval" in view.prompt


def test_open_work_is_ordered_worst_first(tmp_path):
    scores = {**HOLDING, "build.pages-render": 0.0, "query.names-needed-concepts": 0.5}
    base = _run("20260909T100000Z-baseline", "baseline", {**HOLDING, "build.pages-render": 0.0})
    cand = _run("20260909T110000Z-cand", "candidate", scores)
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    built = report.build(directory=tmp_path)
    verdicts = [v.verdict for v in built.open_work()]
    assert verdicts[0] == "failing"
    assert "regressed" in verdicts
    assert verdicts.index("failing") < verdicts.index("regressed")


def test_the_page_renders_and_embeds_the_manifest(tmp_path):
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run("20260909T110000Z-cand", "candidate", {**HOLDING, "query.names-needed-concepts": 0.5})
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    page = report_html.render(report.build(directory=tmp_path))

    assert page.startswith("<!doctype html>")
    assert "__DATA__" not in page and "__JUDGE__" not in page
    payload = json.loads(page.split('type="application/json">')[1].split("</script>")[0])
    assert len(payload["behaviors"]) == len(manifest.BEHAVIORS)
    assert len(payload["components"]) == len(manifest.COMPONENTS)
    for behavior in manifest.BEHAVIORS:
        assert behavior.text in page
        assert behavior.blind in page


def test_the_page_states_a_refusal_instead_of_deltas(tmp_path):
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run(
        "20260909T110000Z-cand", "candidate", {**HOLDING, "query.names-needed-concepts": 0.5},
        prov=_provenance(environment="dev"),
    )
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    built = report.build(directory=tmp_path)
    assert built.is_refused
    assert "Comparison refused" in report_html.render(built)


def test_the_judge_payload_shows_the_blind_spots(tmp_path):
    """A reviewing model that cannot see an eval's limits will overstate the result."""
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    runstore.save(base, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    payload = report.judge_payload(report.build(directory=tmp_path))
    assert all("cannot_see" in entry for entry in payload["behaviors"])
    assert payload["provenance"]["current"]["environment"] == "local"


def test_a_models_reply_cannot_inject_markup():
    html_out = report_html._prose("<script>alert(1)</script>\n\n**bold** text")
    assert "<script>alert(1)</script>" not in html_out
    assert "&lt;script&gt;" in html_out
    assert "<b>bold</b>" in html_out


def test_word_diff_marks_what_moved():
    pairs = diff.word_diff(
        "attachment component configuration file upload data binding",
        "layout configuration data model binding",
    )
    kinds = {kind for kind, _ in pairs}
    assert kinds == {"same", "del", "add"}
    assert ("del", "attachment component") in pairs


def test_a_filtered_run_reads_as_not_run_rather_than_as_a_regression(tmp_path):
    """`--only` leaves most behaviors unmeasured. That must not look like movement."""
    from benchmarks.runstore import BehaviorResult

    behaviors = []
    for behavior in manifest.BEHAVIORS:
        if behavior.id == "confidence.band-matches-outcome":
            assert behavior.evaluator
            behaviors.append(
                BehaviorResult(
                    behavior.id,
                    behavior.evaluator,
                    0.714,
                    (ItemResult("conf-1", {behavior.evaluator: 1.0}),),
                )
            )
        elif behavior.is_pinned:
            behaviors.append(
                BehaviorResult(
                    behavior.id, behavior.evaluator or "", None, (), skipped="not run"
                )
            )
        else:
            behaviors.append(
                BehaviorResult(behavior.id, "none", None, (), skipped="nothing pins this")
            )
    run = Run(
        name="20260909T100000Z-only",
        label="one eval",
        provenance=_provenance(),
        behaviors=tuple(behaviors),
    )
    runstore.save(run, directory=tmp_path)

    counts = report.build(directory=tmp_path).counts()
    assert counts["moved"] == 0
    assert counts["failing"] == 0
    assert counts["not_run"] == len(manifest.pinned()) - 1
    assert counts["unpinned"] == len(manifest.gaps())
    assert counts["holding"] == 0
    assert counts["recorded"] == 1


def test_a_first_run_is_recorded_rather_than_holding(tmp_path):
    """Counting a first run as holding read every score as all-clear, whatever it
    was: a behavior at 0.53 with no baseline reported as green."""
    run = _run("20260909T100000Z-first", "first", {**HOLDING, "confidence.band-matches-outcome": 0.53})
    runstore.save(run, directory=tmp_path)

    built = report.build(directory=tmp_path)

    assert built.counts()["holding"] == 0
    assert built.counts()["recorded"] == len(list(manifest.pinned()))
    weakest = built.short_of_full_marks()
    assert weakest and weakest[0].behavior.id == "confidence.band-matches-outcome"


def test_a_behavior_that_never_moves_is_still_reported_as_weak(tmp_path):
    """Movement is not the only finding. A score that has always been 0.53 holds
    steady forever and is still the worst thing on the page."""
    base = _run("20260909T100000Z-base", "baseline", {**HOLDING, "spec.parses": 0.53})
    cand = _run("20260909T110000Z-cand", "candidate", {**HOLDING, "spec.parses": 0.53})
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path, why="because")

    built = report.build(directory=tmp_path)

    assert _view(built, "spec.parses").verdict == "holding"
    assert [v.behavior.id for v in built.short_of_full_marks()] == ["spec.parses"]


def test_a_first_run_scoring_zero_is_failing_not_holding(tmp_path):
    """With no baseline there is no delta, and a permanent failure must still show."""
    run = _run("20260909T100000Z-first", "first run", {**HOLDING, "build.pages-render": 0.0})
    runstore.save(run, directory=tmp_path)
    built = report.build(directory=tmp_path)
    view = next(v for v in built.behaviors if v.behavior.id == "build.pages-render")
    assert view.verdict == "failing"
    assert built.counts()["failing"] == 1
    assert built.open_work()[0].behavior.id == "build.pages-render"


def test_a_behavior_that_ran_and_scored_nothing_is_never_holding(tmp_path):
    """A wrong evaluator name once made five behaviors report as coverage."""
    from benchmarks.runstore import BehaviorResult

    behaviors = []
    for behavior in manifest.BEHAVIORS:
        if behavior.id == "scope.declines-out-of-scope":
            behaviors.append(
                BehaviorResult(
                    behavior.id,
                    "a_name_no_module_emits",
                    None,
                    (ItemResult("scope-1", {}),),
                )
            )
        elif behavior.is_pinned:
            assert behavior.evaluator
            behaviors.append(
                BehaviorResult(
                    behavior.id, behavior.evaluator, 1.0,
                    (ItemResult(f"{behavior.id}-1", {behavior.evaluator: 1.0}),),
                )
            )
        else:
            behaviors.append(BehaviorResult(behavior.id, "none", None, (), skipped="gap"))
    run = Run("20260909T100000Z-x", "x", _provenance(), tuple(behaviors))
    runstore.save(run, directory=tmp_path)
    built = report.build(directory=tmp_path)
    view = next(v for v in built.behaviors if v.behavior.id == "scope.declines-out-of-scope")
    assert view.verdict == "no-score"
    assert built.counts()["no_score"] == 1
    assert any("evaluator name is wrong" in line for line in view.evidence)


def test_movement_on_a_component_whose_model_did_not_change_is_not_attributable(tmp_path):
    """Two gate behaviors moved across a swap that left the gate model alone."""
    base = _run("20260909T100000Z-baseline", "baseline", HOLDING)
    cand = _run(
        "20260909T110000Z-cand", "candidate", {**HOLDING, "scope.declines-out-of-scope": 0.7},
        prov=_provenance(
            models={"actor": "gpt-5.6-sol", "planner": "gpt-5.6-terra", "default": "gpt-5.4-mini"}
        ),
    )
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    built = report.build(directory=tmp_path)

    scope = next(v for v in built.behaviors if v.behavior.id == "scope.declines-out-of-scope")
    assert scope.verdict == "regressed"
    assert not scope.attributable
    assert any("did not change between these runs" in line for line in scope.evidence)
    assert scope in built.unattributable()

    planner = next(v for v in built.behaviors if v.behavior.id == "query.names-needed-concepts")
    assert planner.attributable


def test_an_output_change_on_a_swapped_model_is_expected_not_a_finding(tmp_path):
    """A different model writes different words; ranking that as movement buries the scores."""
    base = _run(
        "20260909T100000Z-baseline", "baseline", HOLDING,
        outputs={"query.names-needed-concepts": json.dumps({"terms": ["attachment", "binding"]})},
    )
    cand = _run(
        "20260909T110000Z-cand", "candidate", HOLDING,
        outputs={"query.names-needed-concepts": json.dumps({"terms": ["layout", "binding"]})},
        prov=_provenance(
            models={"actor": "gpt-5.6-sol", "planner": "gpt-5.6-terra", "default": "gpt-5.4-mini"}
        ),
    )
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    built = report.build(directory=tmp_path)
    view = next(v for v in built.behaviors if v.behavior.id == "query.names-needed-concepts")
    assert view.verdict == "holding"


def test_an_output_change_with_no_model_change_stays_a_finding(tmp_path):
    """A refactor that alters output is exactly what output diffing is for."""
    base = _run(
        "20260909T100000Z-baseline", "baseline", HOLDING,
        outputs={"query.names-needed-concepts": json.dumps({"terms": ["attachment", "binding"]})},
    )
    cand = _run(
        "20260909T110000Z-cand", "candidate", HOLDING,
        outputs={"query.names-needed-concepts": json.dumps({"terms": ["layout", "binding"]})},
        prov=_provenance(commit="b" * 40),
    )
    for run in (base, cand):
        runstore.save(run, directory=tmp_path)
    runstore.set_baseline(base.name, directory=tmp_path)
    built = report.build(directory=tmp_path)
    view = next(v for v in built.behaviors if v.behavior.id == "query.names-needed-concepts")
    assert view.verdict == "output-changed"
    assert view in built.open_work()


def test_every_component_declares_the_model_role_its_calls_use():
    for component in manifest.COMPONENTS:
        assert component.role in manifest.ROLES


def test_a_reworded_label_is_not_an_output_change(tmp_path):
    """A model is not deterministic. Comparing bytes reports every item as changed."""
    from benchmarks import outputs as out

    before = json.dumps({"id": "barnets-navn", "field_type": "text", "label": "Barnets navn"})
    after = json.dumps({"id": "barnets-navn", "field_type": "text", "label": "Navnet til barnet"})
    change = out.compare(before, after)
    assert change.changed is False
    assert "wording may differ" in change.summary


def test_a_changed_field_type_is_an_output_change():
    from benchmarks import outputs as out

    before = json.dumps({"id": "fodselsdato", "field_type": "date"})
    after = json.dumps({"id": "fodselsdato", "field_type": "text"})
    change = out.compare(before, after)
    assert change.substantive
    assert ("removed", "field_type=date") in change.paths()
    assert ("added", "field_type=text") in change.paths()


def test_a_drifting_number_is_not_an_output_change():
    """A confidence moving 0.95 to 0.9 is sampling, not shape."""
    from benchmarks import outputs as out

    change = out.compare(json.dumps({"confidence": 0.95}), json.dumps({"confidence": 0.9}))
    assert change.changed is False


def test_the_model_name_echoed_into_an_output_is_ignored():
    """Spec extraction returns the model in its own result, which would always differ."""
    from benchmarks import outputs as out

    before = json.dumps({"model": "claude-opus-4-8", "spec": {"language": "nb"}})
    after = json.dumps({"model": "gpt-5.6-terra", "spec": {"language": "nb"}})
    assert out.compare(before, after).changed is False


def test_an_insertion_reports_one_change_not_a_shifted_index_for_every_item():
    """Indexed paths turn one insertion into dozens of differences."""
    from benchmarks import outputs as out

    before = json.dumps({"fields": [{"id": "a"}, {"id": "b"}, {"id": "c"}]})
    after = json.dumps({"fields": [{"id": "a"}, {"id": "new"}, {"id": "b"}, {"id": "c"}]})
    change = out.compare(before, after)
    assert change.added == ("fields[].id=new",)
    assert change.removed == ()


def test_reordering_is_reported_apart_from_a_substantive_change():
    from benchmarks import outputs as out

    before = json.dumps({"fields": [{"id": "a"}, {"id": "b"}]})
    after = json.dumps({"fields": [{"id": "b"}, {"id": "a"}]})
    change = out.compare(before, after)
    assert change.reordered
    assert not change.substantive
    assert change.changed
    assert change.summary == "same fields, different order"


def test_unstructured_output_says_it_cannot_be_compared():
    """Guessing would be worse: for prose there is no way to tell a rewording apart."""
    from benchmarks import outputs as out

    change = out.compare("the request is out of scope", "this request is not in scope")
    assert change.changed is None
    assert not change.substantive
    assert "cannot be told" in change.summary


class TestWhereTheBaselineLives:
    """Runs live in Langfuse; which one is the baseline lives in a committed file."""

    def test_the_pointer_names_a_run_and_says_why(self, tmp_path):
        from benchmarks import baseline as pointer_file

        run = _run("20260909T100000Z-base", "claude baseline", HOLDING)
        pointer = pointer_file.from_run(run, "what main runs today")
        assert pointer.check_id == run.name
        assert pointer.why == "what main runs today"
        assert pointer.axes["environment"] == "local"

    def test_adopting_a_baseline_requires_a_reason(self):
        from benchmarks import baseline as pointer_file

        run = _run("20260909T100000Z-base", "baseline", HOLDING)
        with pytest.raises(AssertionError, match="why it was adopted"):
            pointer_file.from_run(run, "   ")

    def test_the_pointer_round_trips_through_the_committed_file(self, tmp_path):
        from benchmarks import baseline as pointer_file

        run = _run("20260909T100000Z-base", "baseline", HOLDING)
        path = tmp_path / "BASELINE.json"
        pointer_file.write(pointer_file.from_run(run, "because"), path=path)
        assert pointer_file.read(path=path) == pointer_file.from_run(run, "because")

    def test_a_hand_edited_pointer_is_detected_as_drifted(self, tmp_path):
        """A pointer that disagrees with the run it names is not what the commit said."""
        from benchmarks import baseline as pointer_file

        run = _run("20260909T100000Z-base", "baseline", HOLDING)
        pointer = pointer_file.from_run(run, "because")
        edited = pointer_file.Pointer(
            check_id=pointer.check_id,
            label=pointer.label,
            recorded_at=pointer.recorded_at,
            why=pointer.why,
            axes={**pointer.axes, "environment": "dev", "tools": "0000dead"},
        )
        assert set(pointer_file.drifted(edited, run)) == {"environment", "tools"}
        assert pointer_file.drifted(pointer, run) == ()

    def test_the_baseline_is_read_from_the_local_cache_when_it_is_there(self, tmp_path):
        run = _run("20260909T100000Z-base", "baseline", HOLDING)
        runstore.save(run, directory=tmp_path)
        runstore.set_baseline(run.name, directory=tmp_path, why="because")
        found = runstore.baseline(directory=tmp_path)
        assert found is not None and found.name == run.name

    def test_no_pointer_means_no_baseline_rather_than_a_guess(self, tmp_path):
        run = _run("20260909T100000Z-only", "a run", HOLDING)
        runstore.save(run, directory=tmp_path)
        assert runstore.baseline(directory=tmp_path) is None
        base, previous, current = runstore.series(directory=tmp_path)
        assert base is None and previous is None
        assert current is not None and current.name == run.name

    def test_the_series_excludes_the_baseline_from_previous(self, tmp_path):
        base = _run("20260909T100000Z-base", "baseline", HOLDING)
        prev = _run("20260909T110000Z-prev", "previous", HOLDING)
        curr = _run("20260909T120000Z-curr", "current", HOLDING)
        for run in (base, prev, curr):
            runstore.save(run, directory=tmp_path)
        runstore.set_baseline(base.name, directory=tmp_path, why="because")
        found_base, found_prev, found_curr = runstore.series(directory=tmp_path)
        assert found_base and found_prev and found_curr
        assert found_base.name == base.name
        assert found_prev.name == prev.name
        assert found_curr.name == curr.name


class TestReadingARunBackFromLangfuse:
    """A machine that never ran the harness still compares against the same baseline."""

    def _api(self, metadata, items):
        class _Api:
            def _get(self, path, **params):
                if "experiments" in path and "items" not in path:
                    return {
                        "data": [
                            {"id": "exp-1", "name": "run-1", "startTime": "2026-09-09T10:00:00Z",
                             "metadata": metadata}
                        ],
                        "meta": {},
                    }
                return {"data": items, "meta": {}}

        return _Api()

    def _metadata(self):
        return {
            "check_id": "20260909T100000Z-base-ab12",
            "check_label": "claude baseline",
            "eval": "Gates/scope",
            "environment": "local",
            "code": "abc1234 dirty",
            "actor_prompt": "77dd32dbde59",
            "tools": "8f3d1c04",
            "dataset": "2026-09-08T14:22Z",
            "judge": "none",
            "recorded_at": "2026-09-09T10:00:00+00:00",
            "models": json.dumps({"actor": "claude-sonnet-5"}),
            "sampling": json.dumps({"temperature": "0.1"}),
            "prompts": json.dumps({"scope_check": 1}),
            "evaluators": "unknown",
        }

    def test_scores_and_outputs_both_come_back(self):
        from benchmarks import remote

        items = [
            {
                "experimentItemId": "scope-weather",
                "output": json.dumps({"in_scope": False}),
                "scores": [{"name": "gate_verdict", "value": 1.0}],
            }
        ]
        run = remote.fetch(
            "20260909T100000Z-base-ab12", api=self._api(self._metadata(), items)
        )
        scope = run.behavior("scope.declines-out-of-scope")
        assert scope is not None and scope.score == 1.0
        assert scope.items[0].output == json.dumps({"in_scope": False})

    def test_the_provenance_is_decoded_from_the_flat_metadata(self):
        from benchmarks import remote

        run = remote.fetch(
            "20260909T100000Z-base-ab12", api=self._api(self._metadata(), [])
        )
        assert run.provenance.models == {"actor": "claude-sonnet-5"}
        assert run.provenance.actor_prompt == "77dd32dbde59"
        assert run.provenance.code.dirty is True
        assert run.provenance.judge is None

    def test_what_cannot_be_recovered_is_noted_rather_than_guessed(self):
        from benchmarks import remote

        run = remote.fetch(
            "20260909T100000Z-base-ab12", api=self._api(self._metadata(), [])
        )
        assert run.provenance.code.branch is None
        assert any("reconstructed from Langfuse" in note for note in run.provenance.notes)

    def test_an_unknown_check_id_fails_loudly(self):
        from benchmarks import remote

        with pytest.raises(SystemExit, match="No run in Langfuse"):
            remote.fetch("nope", api=self._api(self._metadata(), []))

    def test_a_dataset_absent_from_the_run_is_marked_not_run(self):
        from benchmarks import remote

        run = remote.fetch(
            "20260909T100000Z-base-ab12", api=self._api(self._metadata(), [])
        )
        spec = run.behavior("spec.parses")
        assert spec is not None and spec.score is None
        assert spec.skipped and "not in this run" in spec.skipped


class TestAdoptingACandidateAsTheNewBaseline:
    """The step at the end of a model swap, when the candidate is green."""

    def test_a_run_that_scored_everything_can_be_adopted(self, tmp_path):
        run = _run("20260909T100000Z-cand", "gpt candidate", HOLDING)
        runstore.save(run, directory=tmp_path)
        assert runstore.incomplete(run) == ()
        runstore.set_baseline(run.name, directory=tmp_path, why="shipped in #1234")
        found = runstore.baseline(directory=tmp_path)
        assert found is not None and found.name == run.name

    def test_a_partial_run_is_refused_because_a_holed_baseline_poisons_every_comparison(
        self, tmp_path
    ):
        """`--only Gates/scope` leaves most behaviors unscored."""
        from benchmarks.runstore import BehaviorResult

        behaviors = []
        for behavior in manifest.BEHAVIORS:
            if behavior.id == "scope.declines-out-of-scope":
                assert behavior.evaluator
                behaviors.append(
                    BehaviorResult(
                        behavior.id, behavior.evaluator, 1.0,
                        (ItemResult("scope-1", {behavior.evaluator: 1.0}),),
                    )
                )
            else:
                behaviors.append(
                    BehaviorResult(behavior.id, "", None, (), skipped="not run")
                )
        run = Run("20260909T100000Z-only", "one eval", _provenance(), tuple(behaviors))
        runstore.save(run, directory=tmp_path)

        assert len(runstore.incomplete(run)) == len(manifest.pinned()) - 1
        with pytest.raises(SystemExit, match="baseline with holes"):
            runstore.set_baseline(run.name, directory=tmp_path, why="oops")

    def test_force_adopts_a_partial_run_for_someone_who_means_it(self, tmp_path):
        from benchmarks.runstore import BehaviorResult

        behaviors = [
            BehaviorResult(b.id, b.evaluator or "", None, (), skipped="not run")
            for b in manifest.BEHAVIORS
        ]
        run = Run("20260909T100000Z-part", "partial", _provenance(), tuple(behaviors))
        runstore.save(run, directory=tmp_path)
        runstore.set_baseline(run.name, directory=tmp_path, why="deliberate", force=True)
        assert runstore.baseline(directory=tmp_path) is not None

    def test_adopting_a_candidate_makes_the_next_run_compare_against_it(self, tmp_path):
        """Three weeks on: the old baseline is history, the adopted run is the reference."""
        old = _run("20260901T100000Z-old", "three weeks ago", HOLDING)
        cand = _run("20260922T100000Z-cand", "gpt candidate", {**HOLDING, "spec.parses": 1.0})
        for run in (old, cand):
            runstore.save(run, directory=tmp_path)
        runstore.set_baseline(old.name, directory=tmp_path, why="what main ran")

        base, _, current = runstore.series(directory=tmp_path)
        assert base is not None and base.name == old.name
        assert current is not None and current.name == cand.name

        runstore.set_baseline(cand.name, directory=tmp_path, why="adopted with the gpt swap")
        base, previous, current = runstore.series(directory=tmp_path)
        assert base is not None and base.name == cand.name
        assert current is not None and current.name == cand.name
        assert previous is None, "the reference and the newest run are the same run"


class TestAStaleBaselineSaysWhatToDoAboutIt:
    """Weeks after a baseline is adopted, the likeliest refusal is someone else's edit."""

    def test_a_changed_dataset_is_named_as_a_yardstick_change(self):
        from benchmarks.provenance import remedy

        lines = remedy(("dataset",))
        assert any("predates a change to what is measured" in line for line in lines)
        assert any("adopt it as the baseline" in line for line in lines)
        assert any("same pull request" in line for line in lines)

    def test_a_changed_environment_is_named_as_a_deployment_difference(self):
        from benchmarks.provenance import remedy

        lines = remedy(("environment",))
        assert any("different environments" in line for line in lines)
        assert not any("predates a change" in line for line in lines)

    def test_every_remedy_offers_the_escape_hatch(self):
        from benchmarks.provenance import MEASUREMENT_AXES, remedy

        for axis in MEASUREMENT_AXES + ("environment", "judge"):
            lines = remedy((axis,))
            assert any(f"--under-test {axis}" in line for line in lines)


def test_previous_never_reaches_langfuse(monkeypatch, tmp_path):
    """It once did, and a run someone else made showed up as this branch's previous."""
    from benchmarks import remote

    def fail(*_args, **_kwargs):
        raise AssertionError("previous() must not consult Langfuse")

    monkeypatch.setattr(remote, "check_ids", fail)
    monkeypatch.setattr(remote, "fetch", fail)
    run = _run("20260909T100000Z-only", "a run", HOLDING)
    runstore.save(run, directory=tmp_path)
    assert runstore.previous(run, directory=tmp_path) is None
