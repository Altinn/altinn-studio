"""Evaluate Altinn layout expressions, so the bench can score what an expression does.

Some scores need more than what an expression reads: a `hidden` expression must hide a field for every answer but
one, and the conditions on an exclusive gateway must send each amount down the right flow. The bench sets values
in a data model and evaluates the expression here. Only a subset of the functions is supported. It casts, compares
and handles null as app-frontend and the app backend do, which the tests check against the expression tests both of
them run (`src/common/expression-tests`). Where the expression uses a function outside the subset, or a value the
two treat differently, evaluation raises `Unsupported`, so the caller can leave the check unmeasured instead of
guessing.
"""

from __future__ import annotations

import json
import operator
import re
from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass, field
from typing import Any, Protocol


class ExpressionError(Exception):
    """The expression is invalid, and the frontend and the backend both fail on it."""


class Unsupported(Exception):
    """The expression uses a function outside the subset, or a value the frontend and the backend treat differently."""


class Context(Protocol):
    def data_model(self, path: str, data_type: str | None) -> Any: ...

    def component(self, component_id: str) -> Any: ...

    def gateway_action(self) -> str | None: ...


_REPEATING_TYPES = frozenset({"RepeatingGroup", "Likert"})


@dataclass
class FormContext:
    """A form's data models and layouts, seen from a component outside any repeating group.

    A component in a repeating group cannot be looked up without a row, so that fails, as it does in the app. A
    hidden component reads as null. The groups that hide a component are the ones that list it in `children`.
    """

    data: Mapping[str, Any]  # data type -> data model
    layouts: Mapping[str, list[dict[str, Any]]] = field(default_factory=dict)  # page -> components
    hidden_pages: Mapping[str, Any] = field(default_factory=dict)  # page -> the page's hidden expression
    default_data_type: str = "default"
    action: str | None = None  # what gatewayAction gives

    def data_model(self, path: str, data_type: str | None) -> Any:
        data_type = data_type or self.default_data_type
        if data_type not in self.data:
            raise ExpressionError(f"Data model with type {data_type} not found")
        value = self.data[data_type]
        for part in path.split("."):
            match = _PATH_PART.fullmatch(part)
            if match is None or not isinstance(value, dict):
                return None
            value = value.get(match[1])
            for index in map(int, re.findall(r"\d+", match[2])):
                value = value[index] if isinstance(value, list) and index < len(value) else None
        return value

    def component(self, component_id: str) -> Any:
        page, chain = self._locate(component_id)
        binding = (chain[0].get("dataModelBindings") or {}).get("simpleBinding")
        if not binding:
            raise ExpressionError(f"Component {component_id} does not have a simpleBinding")
        if any(container.get("type") in _REPEATING_TYPES for container in chain[1:]):
            raise ExpressionError(
                f"Unable to find component with identifier {component_id} outside its repeating group"
            )
        if self._hidden(page, chain):
            return None
        if isinstance(binding, dict):
            return self.data_model(str(binding.get("field")), binding.get("dataType"))
        return self.data_model(str(binding), None)

    def gateway_action(self) -> str | None:
        return self.action

    def is_hidden(self, component_id: str) -> bool:
        """Whether the component, a group it is in or its page is hidden."""
        return self._hidden(*self._locate(component_id))

    def _locate(self, component_id: str) -> tuple[str, list[dict[str, Any]]]:
        """The component's page, and the component followed by the groups it is in, innermost first."""
        found = {c.get("id"): (page, c) for page, components in self.layouts.items() for c in components}
        if component_id not in found:
            raise ExpressionError(f"Unable to find component with identifier {component_id}")
        # A multi-page repeating group lists its children as "page:id"
        parents = {
            child.split(":")[-1]: container
            for _, container in found.values()
            for child in container.get("children") or []
            if isinstance(child, str)
        }
        page, component = found[component_id]
        chain = [component]
        while (parent := parents.get(chain[-1].get("id", ""))) is not None and parent not in chain:
            chain.append(parent)
        return page, chain

    def _hidden(self, page: str, chain: list[dict[str, Any]]) -> bool:
        expressions = [self.hidden_pages.get(page), *(c.get("hidden") for c in reversed(chain))]
        return any(_hides(evaluate(expression, self)) for expression in expressions)


_PATH_PART = re.compile(r"([^\[\]]+)((?:\[\d+\])*)")


def evaluate(expression: Any, context: Context) -> Any:
    """Evaluate a parsed expression. A literal is its own value."""
    _check(expression)
    unsupported = functions_used(expression) - SUPPORTED_FUNCTIONS
    if unsupported:
        raise Unsupported(f"Functions outside the supported subset: {', '.join(sorted(unsupported))}")
    return _evaluate(expression, context)


def functions_used(expression: Any) -> set[str]:
    return {call[0] for call in _calls(expression)}


def data_model_refs(expression: Any) -> list[tuple[str, str | None]]:
    """The paths the expression reads with dataModel, with their data types. A computed path is left out."""
    refs = [
        (call[1], call[2] if len(call) > 2 and isinstance(call[2], str) else None)
        for call in _calls(expression)
        if call[0] == "dataModel" and len(call) > 1 and isinstance(call[1], str)
    ]
    return list(dict.fromkeys(refs))


def component_refs(expression: Any) -> list[str]:
    """The components the expression reads with component. A computed id is left out."""
    refs = [
        call[1] for call in _calls(expression) if call[0] == "component" and len(call) > 1 and isinstance(call[1], str)
    ]
    return list(dict.fromkeys(refs))


def _calls(expression: Any) -> Iterator[list[Any]]:
    if isinstance(expression, list) and expression and isinstance(expression[0], str):
        yield expression
        for arg in expression[1:]:
            yield from _calls(arg)


def _evaluate(expression: Any, context: Context) -> Any:
    if not isinstance(expression, list):
        return expression
    name, *args = expression
    # Both sides evaluate every argument first, so an error in the branch an `if` does not take still fails
    return _FUNCTIONS[name][2](context, [_evaluate(arg, context) for arg in args])


def _check(expression: Any) -> None:
    if isinstance(expression, list):
        if not expression:
            raise ExpressionError("Missing function name in expression")
        name, *args = expression
        if not isinstance(name, str):
            raise ExpressionError("Function name in expression should be string")
        for arg in args:
            _check(arg)
        if name not in KNOWN_FUNCTIONS:
            raise ExpressionError(f'Function "{name}" not implemented')
        if name in _FUNCTIONS:
            _check_arguments(name, args)
    elif expression is not None and not isinstance(expression, str | int | float):
        raise ExpressionError('Invalid type "object"')


def _check_arguments(name: str, args: list[Any]) -> None:
    if name == "if":
        if len(args) > 2 and args[2] != "else":
            raise ExpressionError('Expected third argument to be "else"')
        if len(args) not in (2, 4):
            raise ExpressionError(f"Expected either 2 arguments (if) or 4 (if + else), got {len(args)}")
        return
    fewest, most, _ = _FUNCTIONS[name]
    if len(args) < fewest or (most is not None and len(args) > most):
        expected = f"{fewest}+" if most is None else str(fewest) if fewest == most else f"{fewest}-{most}"
        raise ExpressionError(f"Expected {expected} argument(s), got {len(args)}")
    if name == "dataModel" and len(args) == 2 and args[1] is not None and not isinstance(args[1], str):
        raise ExpressionError("The data type must be a string (expressions cannot be used here)")


# Both read these strings as numbers. The backend also reads a leading "+" or a missing integer part without an
# exponent, such as "+5" and ".5", which the frontend refuses.
_NUMBER = re.compile(r"-?[0-9]+(\.[0-9]+)?|[-+]?([0-9]+(\.[0-9]+)?|\.[0-9]+)[eE][-+]?[0-9]+")
_BACKEND_NUMBER = re.compile(r"[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?")
_NULL_STRING = 'The frontend reads "null" as null where it expects a number or a boolean, and the backend fails'


def _parse_number(text: str) -> float | None:
    text = text.strip()
    if _NUMBER.fullmatch(text):
        return float(text)
    if _BACKEND_NUMBER.fullmatch(text):
        raise Unsupported(f'Only the backend reads "{text}" as a number')
    return None


def _number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, int | float) and not isinstance(value, bool):
        return value
    if value == "null":
        raise Unsupported(_NULL_STRING)
    number = _parse_number(value) if isinstance(value, str) else None
    if number is not None:
        return number
    hint = " (a comma is not a decimal separator, use a period)" if isinstance(value, str) and "," in value else ""
    raise ExpressionError(f"Expected number, got value {json.dumps(value, ensure_ascii=False)}{hint}")


def _boolean(value: Any) -> bool:
    if value is None or isinstance(value, bool):
        return bool(value)
    if value in ("true", "false"):
        return value == "true"
    if value == "null":
        raise Unsupported(_NULL_STRING)
    number = _parse_number(value) if isinstance(value, str) else value
    if isinstance(number, int | float) and number in (0, 1):
        return number == 1
    raise ExpressionError(f"Expected boolean, got value {json.dumps(value, ensure_ascii=False)}")


def _hides(value: Any) -> bool:
    """Both sides show a component whose hidden expression gives anything but true."""
    if value == "null":
        return False
    try:
        return _boolean(value)
    except ExpressionError:
        return False


def _text(value: Any) -> str | None:
    """The string both sides compare and join, with any casing of true, false and null read as that literal."""
    if value is None or isinstance(value, bool):
        return None if value is None else str(value).lower()
    if isinstance(value, int | float):
        # Both write the fewest digits that read back as the same number, but switch to an exponent at different sizes
        if value != 0 and not 1e-4 <= abs(value) < 1e15:
            raise Unsupported(f"The frontend and the backend write {value!r} differently")
        return str(int(value)) if value == int(value) else repr(value)
    if isinstance(value, str):
        lowered = value.lower()
        if lowered == "null":
            return None
        return lowered if lowered in ("true", "false") else value
    raise Unsupported("The frontend and the backend write lists and objects as different strings")


_Function = Callable[[Context, list[Any]], Any]


def _number_test(test: Callable[[float, float], bool]) -> _Function:
    def function(_: Context, args: list[Any]) -> bool:
        a, b = _number(args[0]), _number(args[1])
        return a is not None and b is not None and test(a, b)

    return function


def _text_test(test: Callable[[str, str], bool]) -> _Function:
    def function(_: Context, args: list[Any]) -> bool:
        a, b = _text(args[0]), _text(args[1])
        return a is not None and b is not None and test(a, b)

    return function


def _text_map(change: Callable[[str], str]) -> _Function:
    def function(_: Context, args: list[Any]) -> str | None:
        text = _text(args[0])
        return None if text is None else change(text)

    return function


def _and(_: Context, args: list[Any]) -> bool:
    values = [_boolean(arg) for arg in args]  # every argument is cast, so an invalid one fails after a false one too
    return all(values)


def _or(_: Context, args: list[Any]) -> bool:
    values = [_boolean(arg) for arg in args]
    return any(values)


def _if(_: Context, args: list[Any]) -> Any:
    if _boolean(args[0]):
        return args[1]
    return args[3] if len(args) == 4 else None


def _string_length(_: Context, args: list[Any]) -> int:
    # In UTF-16 code units, as JavaScript and .NET count
    return len((_text(args[0]) or "").encode("utf-16-le")) // 2


def _comma_contains(text: str, item: str) -> bool:
    return item in (part.strip() for part in text.split(","))


_contains = _text_test(operator.contains)


def _data_model(context: Context, args: list[Any]) -> Any:
    path = _text(args[0])
    if path is None:
        raise ExpressionError("Cannot lookup dataModel null")
    return context.data_model(path, args[1] if len(args) == 2 else None)


def _component(context: Context, args: list[Any]) -> Any:
    component_id = _text(args[0])
    if component_id is None:
        raise ExpressionError("Cannot lookup component null")
    return context.component(component_id)


# name -> (fewest arguments, most arguments or None for any number, implementation)
_FUNCTIONS: dict[str, tuple[int, int | None, _Function]] = {
    "equals": (2, 2, lambda _, args: _text(args[0]) == _text(args[1])),
    "notEquals": (2, 2, lambda _, args: _text(args[0]) != _text(args[1])),
    "not": (1, 1, lambda _, args: not _boolean(args[0])),
    "and": (1, None, _and),
    "or": (1, None, _or),
    "if": (2, 4, _if),
    "greaterThan": (2, 2, _number_test(operator.gt)),
    "greaterThanEq": (2, 2, _number_test(operator.ge)),
    "lessThan": (2, 2, _number_test(operator.lt)),
    "lessThanEq": (2, 2, _number_test(operator.le)),
    "commaContains": (2, 2, _text_test(_comma_contains)),
    "contains": (2, 2, _contains),
    "notContains": (2, 2, lambda context, args: not _contains(context, args)),
    "startsWith": (2, 2, _text_test(str.startswith)),
    "endsWith": (2, 2, _text_test(str.endswith)),
    "lowerCase": (1, 1, _text_map(str.lower)),
    "upperCase": (1, 1, _text_map(str.upper)),
    "stringLength": (1, 1, _string_length),
    "concat": (0, None, lambda _, args: "".join(_text(arg) or "" for arg in args)),
    "dataModel": (1, 2, _data_model),
    "component": (1, 1, _component),
    "gatewayAction": (0, 0, lambda context, _: context.gateway_action()),
}

SUPPORTED_FUNCTIONS = frozenset(_FUNCTIONS)

# Every function app-frontend or the app backend implements. The rest are invalid in both.
KNOWN_FUNCTIONS = SUPPORTED_FUNCTIONS | {
    "_experimentalSelectAndMap",
    "argv",
    "authContext",
    "average",
    "compare",
    "count",
    "countDataElements",
    "displayValue",
    "divide",
    "externalApi",
    "formatDate",
    "formatNumber",
    "frontendSettings",
    "instanceContext",
    "jmespath",
    "language",
    "linkToComponent",
    "linkToPage",
    "list",
    "lowerCaseFirst",
    "minus",
    "multiply",
    "object",
    "optionLabel",
    "plus",
    "round",
    "stringIndexOf",
    "stringReplace",
    "stringSlice",
    "sum",
    "text",
    "upperCaseFirst",
    "value",
}
