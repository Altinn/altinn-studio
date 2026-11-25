"""Tests for the benchmark app model, rubric builder, and evaluators."""

from __future__ import annotations

import json
from pathlib import Path

from benchmarks.app_model import load_app, match_title, normalize_title
from benchmarks.evaluators import evaluate
from benchmarks.planner import spec_field_count
from benchmarks.rubric import RUBRIC_VERSION, Rubric, build_rubric_from_dir


def _component(cid: str, ctype: str, title_key: str | None = None) -> dict:
    component: dict = {"id": cid, "type": ctype}
    if title_key:
        component["textResourceBindings"] = {"title": title_key}
    return component


def _write_app(
    root: Path,
    pages: dict[str, list[dict]],
    order: list[str] | None = None,
    resources: dict[str, str] | None = None,
) -> Path:
    layouts_dir = root / "App" / "ui" / "form" / "layouts"
    layouts_dir.mkdir(parents=True)
    settings = {"pages": {"order": order if order is not None else list(pages.keys())}}
    (layouts_dir.parent / "Settings.json").write_text(json.dumps(settings), encoding="utf-8")
    for page, components in pages.items():
        (layouts_dir / f"{page}.json").write_text(json.dumps({"data": {"layout": components}}), encoding="utf-8")
    texts_dir = root / "App" / "config" / "texts"
    texts_dir.mkdir(parents=True)
    resource_entries = [{"id": k, "value": v} for k, v in (resources or {}).items()]
    (texts_dir / "resource.nb.json").write_text(
        json.dumps({"language": "nb", "resources": resource_entries}), encoding="utf-8"
    )
    return root


def _golden(root: Path, order: list[str] | None = None) -> Path:
    return _write_app(
        root,
        pages={
            "Side1": [
                _component("name-input", "Input", "app.field.navn"),
                _component("nav-one", "NavigationButtons"),
            ],
            "Side2": [
                _component("email-input", "Input", "app.field.epost"),
                _component("nav-two", "NavigationButtons"),
            ],
        },
        order=order,
        resources={
            "app.field.navn": "A.1 Leverandørvirksomhetens navn",
            "app.field.epost": "A.2 E-postadresse",
        },
    )


class TestTitleMatching:
    def test_normalization_strips_enumeration_case_and_punctuation(self):
        assert normalize_title("A.1 Leverandørvirksomhetens navn:") == ("leverandørvirksomhetens navn")

    def test_titles_match_across_naming_styles(self):
        assert match_title("A.1 Leverandørvirksomhetens navn", [("leverandørvirksomhetens navn", "found")]) == ["found"]
        assert match_title("E-postadresse", [("Organisasjonsnummer", "found")]) == []


class TestRubric:
    def test_built_from_golden_app(self, tmp_path: Path):
        rubric = build_rubric_from_dir(_golden(tmp_path))
        assert rubric["rubric_version"] == RUBRIC_VERSION
        assert rubric["expected_pages"] == 2
        assert rubric["min_input_components"] == 2
        assert rubric["navigation_required"] is True
        assert "A.1 Leverandørvirksomhetens navn" in rubric["expected_titles"]


class TestEvaluators:
    def _scores(self, app_dir: Path, rubric: dict) -> dict[str, float]:
        return {s.name: s.value for s in evaluate(load_app(app_dir), Rubric.model_validate(rubric))}

    def test_identical_app_scores_perfect(self, tmp_path: Path):
        golden = _golden(tmp_path / "golden")
        rubric = build_rubric_from_dir(golden)
        scores = self._scores(golden, rubric)
        assert scores == {
            "bench_pages": 1.0,
            "bench_navigation": 1.0,
            "bench_field_coverage": 1.0,
            "bench_input_count": 1.0,
        }

    def test_different_page_and_field_names_still_score_perfect(self, tmp_path: Path):
        """The rubric must be name-agnostic — same form, different naming."""
        rubric = build_rubric_from_dir(_golden(tmp_path / "golden"))
        candidate = _write_app(
            tmp_path / "candidate",
            pages={
                "del-a": [
                    _component("supplier-name", "Input", "app.delA.leverandor"),
                    _component("nav-a", "NavigationButtons"),
                ],
                "del-b": [
                    _component("contact-email", "Input", "app.delB.epost"),
                    _component("nav-b", "NavigationButtons"),
                ],
            },
            resources={
                "app.delA.leverandor": "Leverandørvirksomhetens navn",
                "app.delB.epost": "E-postadresse",
            },
        )
        scores = self._scores(candidate, rubric)
        assert all(value == 1.0 for value in scores.values()), scores

    def test_missing_navigation_and_field_detected(self, tmp_path: Path):
        rubric = build_rubric_from_dir(_golden(tmp_path / "golden"))
        candidate = _write_app(
            tmp_path / "candidate",
            pages={
                "Side1": [_component("name-input", "Input", "app.field.navn")],
                "Side2": [_component("nav-two", "NavigationButtons")],
            },
            resources={"app.field.navn": "Leverandørvirksomhetens navn"},
        )
        scores = self._scores(candidate, rubric)
        assert scores["bench_navigation"] == 0.0
        assert scores["bench_field_coverage"] == 0.5
        assert scores["bench_input_count"] == 0.5

    def test_a_page_missing_from_the_order_is_not_counted(self, tmp_path: Path):
        rubric = build_rubric_from_dir(_golden(tmp_path / "golden"))
        scores = self._scores(_golden(tmp_path / "candidate", order=["Side1"]), rubric)
        assert scores["bench_pages"] == 0.0
        assert scores["bench_field_coverage"] == scores["bench_input_count"] == 0.5

    def test_two_titles_that_only_numbers_tell_apart_need_two_fields(self, tmp_path: Path):
        titles = ["A.2 E-postadresse", "B.4 E-postadresse"]
        rubric = {**build_rubric_from_dir(_golden(tmp_path / "golden")), "expected_titles": titles}
        assert self._scores(_golden(tmp_path / "candidate"), rubric)["bench_field_coverage"] == 0.5


def test_the_spec_field_count_leaves_out_headings_and_paragraphs():
    """Some runs return the form's headings and intro text and some do not."""
    spec = {"pages": [{"fields": [{"field_type": t} for t in ("header", "paragraph", "text", "date")]}]}
    [score] = spec_field_count(output={"spec": spec}, expected_output={"field_count": 2})
    assert score.value == 1.0
