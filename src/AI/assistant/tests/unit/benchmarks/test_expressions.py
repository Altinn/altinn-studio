"""The expression evaluator agrees with app-frontend and the app backend on the expression tests they share."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, NamedTuple

import pytest

from benchmarks.expressions import (
    KNOWN_FUNCTIONS,
    SUPPORTED_FUNCTIONS,
    ExpressionError,
    FormContext,
    Unsupported,
    component_refs,
    data_model_refs,
    evaluate,
    functions_used,
)

_REPO = next(p for p in Path(__file__).resolve().parents if (p / "src/common/expression-tests").is_dir())
_EVALUATION = _REPO / "src/common/expression-tests/evaluation"
# The frontend cannot evaluate gatewayAction, so only the backend runs these
_BACKEND_GATEWAY_ACTION = (
    _REPO
    / "src/App/backend/test/Altinn.App.Core.Tests/LayoutExpressions/CommonTests/exclusive-tests/functions/gatewayAction"
)

_FOLDERS = {name: _EVALUATION / "functions" / name for name in sorted(SUPPORTED_FUNCTIONS)} | {
    "dataModelMultiple": _EVALUATION / "functions/dataModelMultiple",
    "unknown": _EVALUATION / "functions/unknown",
    "invalid": _EVALUATION / "invalid",
    "gatewayAction (backend)": _BACKEND_GATEWAY_ACTION,
}

# The fewest cases each folder must run. Fewer means the shared tests changed shape and are being skipped.
_FLOORS = {
    "and": 17,
    "commaContains": 6,
    "component": 12,
    "concat": 6,
    "contains": 9,
    "dataModel": 21,
    "dataModelMultiple": 5,
    "endsWith": 8,
    "equals": 36,
    "gatewayAction (backend)": 3,
    "greaterThan": 47,
    "greaterThanEq": 39,
    "if": 16,
    "invalid": 8,
    "lessThan": 39,
    "lessThanEq": 39,
    "lowerCase": 5,
    "not": 17,
    "notContains": 7,
    "notEquals": 24,
    "or": 13,
    "startsWith": 10,
    "stringLength": 7,
    "unknown": 3,
    "upperCase": 5,
}


class _Case(NamedTuple):
    folder: str
    id: str
    test: dict[str, Any]
    case: dict[str, Any]
    skip: str | None


def _load_cases() -> list[_Case]:
    cases = []
    for folder, directory in _FOLDERS.items():
        for path in sorted(directory.glob("*.json")):
            test = json.loads(path.read_text(encoding="utf-8"))
            items = ([test] if "expression" in test else []) + test.get("testCases", [])
            for index, item in enumerate(items):
                case_id = f"{folder}/{path.stem}" + (f"/{index}" if len(items) > 1 else "")
                cases.append(_Case(folder, case_id, test, item, _skip_reason(test, item)))
    return cases


def _skip_reason(test: dict[str, Any], case: dict[str, Any]) -> str | None:
    if test.get("disabledFrontend") or test.get("disabledBackend"):
        return "a known difference between the frontend and the backend"
    if (test.get("context") or {}).get("rowIndices"):
        return "evaluates in a repeating group row"
    if unsupported := functions_used(case["expression"]) & KNOWN_FUNCTIONS - SUPPORTED_FUNCTIONS:
        return f"uses {', '.join(sorted(unsupported))}"
    return None


_CASES = _load_cases()


def _context(test: dict[str, Any]) -> FormContext:
    if "dataModels" in test:
        data = {model["dataElement"]["dataType"]: model["data"] for model in test["dataModels"]}
    else:
        data = {"default": test.get("dataModel", {})}
    pages = {name: layout["data"] for name, layout in (test.get("layouts") or {}).items()}
    return FormContext(
        data=data,
        layouts={name: page.get("layout", []) for name, page in pages.items()},
        hidden_pages={name: page["hidden"] for name, page in pages.items() if "hidden" in page},
        action=test.get("gatewayAction"),
    )


def _same(actual: Any, expected: Any) -> bool:
    """Equal as JSON values: a number is not a boolean, and 14 is 14.0."""
    if isinstance(actual, list) and isinstance(expected, list):
        return len(actual) == len(expected) and all(map(_same, actual, expected, strict=True))
    if isinstance(actual, dict) and isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(_same(actual[key], expected[key]) for key in actual)
    numbers = all(isinstance(value, int | float) and not isinstance(value, bool) for value in (actual, expected))
    return (numbers or type(actual) is type(expected)) and actual == expected


@pytest.mark.parametrize(
    ("test", "case"),
    [pytest.param(c.test, c.case, id=c.id, marks=[pytest.mark.skip(reason=c.skip)] if c.skip else []) for c in _CASES],
)
def test_agrees_with_the_shared_case(test: dict[str, Any], case: dict[str, Any]):
    context = _context(test)
    if "expectsFailure" in case:
        with pytest.raises(ExpressionError) as error:
            evaluate(case["expression"], context)
        assert case["expectsFailure"] in str(error.value)
    else:
        result = evaluate(case["expression"], context)
        assert _same(result, case["expects"]), f"got {result!r}, expected {case['expects']!r}"


def test_runs_most_shared_cases():
    runnable = Counter(c.folder for c in _CASES if c.skip is None)
    too_few = {folder: runnable[folder] for folder, floor in _FLOORS.items() if runnable[folder] < floor}
    assert not too_few, f"runs fewer shared cases than expected: {too_few}"
    assert _FLOORS.keys() == _FOLDERS.keys() - {"gatewayAction"}


def test_knows_every_function_the_shared_tests_cover():
    folders = {path.name for path in (_EVALUATION / "functions").iterdir() if path.is_dir()}
    functions = {"compare" if name.startswith("compare-") else name for name in folders}
    assert functions - {"dataModelMultiple", "unknown"} == KNOWN_FUNCTIONS


def test_a_function_outside_the_subset_is_unsupported():
    context = FormContext(data={"default": {"a": "x"}})
    with pytest.raises(Unsupported, match="text"):
        evaluate(["equals", ["dataModel", "a"], ["text", "x"]], context)
    with pytest.raises(Unsupported, match="plus"):
        evaluate(["if", False, ["plus", 1, 2], "else", 0], context)


def test_an_unknown_function_is_invalid_not_unsupported():
    with pytest.raises(ExpressionError, match='Function "applicationSettings" not implemented'):
        evaluate(["equals", ["text", "x"], ["applicationSettings"]], FormContext(data={}))


@pytest.mark.parametrize(
    "expression",
    [
        ["greaterThan", "+5", 4],
        ["lessThan", ".5", 1],
        ["not", "null"],
        ["equals", 1e15, "1000000000000000"],
        ["equals", 0.00001, "0.00001"],
        ["contains", ["dataModel", "choices"], "Annet"],
    ],
)
def test_a_value_the_two_sides_treat_differently_is_unsupported(expression: list[Any]):
    with pytest.raises(Unsupported):
        evaluate(expression, FormContext(data={"default": {"choices": ["Ja", "Annet"]}}))


def test_shows_a_follow_up_field_only_for_one_answer():
    layouts = {
        "Side1": [
            {"id": "A9", "type": "RadioButtons", "dataModelBindings": {"simpleBinding": "skjema.a9"}},
            {
                "id": "A10",
                "type": "Input",
                "dataModelBindings": {"simpleBinding": "skjema.a10"},
                "hidden": ["notEquals", ["component", "A9"], "Ja"],
            },
        ]
    }
    shown = [
        answer
        for answer in ("Ja", "Nei", "", None)
        if not FormContext(data={"default": {"skjema": {"a9": answer}}}, layouts=layouts).is_hidden("A10")
    ]
    assert shown == ["Ja"]


def test_a_hidden_page_hides_its_components():
    context = FormContext(
        data={"default": {"belop": 600000, "navn": "Kari"}},
        layouts={"Side2": [{"id": "navn", "type": "Input", "dataModelBindings": {"simpleBinding": "navn"}}]},
        hidden_pages={"Side2": ["greaterThan", ["dataModel", "belop"], 500000]},
    )
    assert context.is_hidden("navn")
    assert evaluate(["component", "navn"], context) is None


def test_walkers_find_what_an_expression_reads():
    expression = [
        "and",
        ["greaterThan", ["dataModel", "soknad.belop"], 500000],
        ["equals", ["dataModel", "a", "other"], ["component", "A9"]],
        ["commaContains", ["component", "A12"], "Annet"],
        ["dataModel", ["concat", "soknad.", ["dataModel", "felt"]]],
        ["equals", ["component", "A9"], ["dataModel", "soknad.belop"]],
    ]
    assert functions_used(expression) == {
        "and",
        "greaterThan",
        "dataModel",
        "equals",
        "component",
        "commaContains",
        "concat",
    }
    assert data_model_refs(expression) == [("soknad.belop", None), ("a", "other"), ("felt", None)]
    assert component_refs(expression) == ["A9", "A12"]


def test_walkers_find_nothing_in_a_literal():
    assert functions_used(True) == set()
    assert data_model_refs("soknad.belop") == []
    assert component_refs(None) == []
