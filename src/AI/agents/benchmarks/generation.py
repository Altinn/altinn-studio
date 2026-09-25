"""Scoring what a model generates, without running the tools it asks for."""

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

from langfuse import Evaluation

from agents.core.llm_adapter import build_adapter
from agents.core.messages import (
    AssistantMessage,
    Message,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
)

TOOL_CALLS_KEY = "tool_calls"
TEXT_KEY = "text"


def message_from_item(entry: dict[str, Any]) -> Message:
    """One conversation turn, as a dataset item spells it."""
    role = entry.get("role")
    if role == "user":
        if "tool_results" in entry:
            return UserMessage(
                content=[
                    ToolResultBlock(
                        tool_use_id=result.get("tool_use_id", f"stub-{index}"),
                        content=result["content"],
                        is_error=result.get("is_error", False),
                    )
                    for index, result in enumerate(entry["tool_results"])
                ]
            )
        return UserMessage(content=entry["text"])
    if role == "assistant":
        blocks: list[Any] = []
        if entry.get("text"):
            blocks.append(TextBlock(text=entry["text"]))
        for index, call in enumerate(entry.get("tool_calls") or []):
            blocks.append(
                ToolUseBlock(
                    id=call.get("id", f"stub-{index}"),
                    name=call["name"],
                    input=call.get("input", {}),
                )
            )
        return AssistantMessage(content=blocks)
    raise ValueError(f"unknown role {role!r} in a conversation entry")


def conversation_from_item(item_input: dict[str, Any]) -> list[Message]:
    return [message_from_item(entry) for entry in item_input["conversation"]]


@dataclass(frozen=True)
class GeneratedTurn:
    """What the model produced, in the shape the evaluators read."""

    tool_calls: list[dict[str, Any]]
    text: str
    stop_reason: str | None

    def as_output(self) -> dict[str, Any]:
        return {
            TOOL_CALLS_KEY: self.tool_calls,
            TEXT_KEY: self.text,
            "stop_reason": self.stop_reason,
        }


def turn_from_reply(reply: AssistantMessage) -> GeneratedTurn:
    calls = [{"name": block.name, "input": block.input} for block in reply.content if isinstance(block, ToolUseBlock)]
    text = "".join(block.text for block in reply.content if isinstance(block, TextBlock))
    return GeneratedTurn(tool_calls=calls, text=text, stop_reason=reply.stop_reason)


def rule_of(expected_output: Any) -> dict[str, Any]:
    """The scored assertions in an expected output."""
    if isinstance(expected_output, dict):
        rule = expected_output.get("rule")
        return rule if isinstance(rule, dict) else expected_output
    return {}


def _calls(output: Any) -> list[dict[str, Any]]:
    if isinstance(output, dict) and isinstance(output.get(TOOL_CALLS_KEY), list):
        return output[TOOL_CALLS_KEY]
    return []


def _first_call_name(output: Any) -> str | None:
    calls = _calls(output)
    return calls[0]["name"] if calls else None


def _call_names(output: Any) -> list[str]:
    """Every tool named this turn. A real turn carries several calls, so
    reading only the first scores a different decision than the model made."""
    return [call["name"] for call in _calls(output) if call.get("name")]


def tool_choice(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Did it reach for the tool the turn calls for."""
    expected = rule_of(expected_output).get("tool")
    if not expected:
        return []
    actual = _first_call_name(output)
    return [
        Evaluation(
            name="gen_tool_choice",
            value=1.0 if actual == expected else 0.0,
            data_type="BOOLEAN",
            comment=f"expected {expected}, got {actual or 'no tool call'}",
        )
    ]


def tool_arguments(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Are the arguments that matter right."""
    expected = rule_of(expected_output).get("arguments")
    if not expected:
        return []
    calls = _calls(output)
    if not calls:
        return [
            Evaluation(
                name="gen_tool_arguments",
                value=0.0,
                data_type="NUMERIC",
                comment="no tool call to inspect",
            )
        ]
    actual = calls[0].get("input") or {}
    wrong = {
        key: f"expected {value!r}, got {actual.get(key)!r}"
        for key, value in expected.items()
        if actual.get(key) != value
    }
    return [
        Evaluation(
            name="gen_tool_arguments",
            value=round((len(expected) - len(wrong)) / len(expected), 4),
            data_type="NUMERIC",
            comment="all expected arguments match" if not wrong else "; ".join(f"{k}: {v}" for k, v in wrong.items()),
        )
    ]


def allowed_tools(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Was the chosen tool one of the defensible ones."""
    allowed = rule_of(expected_output).get("allowed_tools")
    if not allowed:
        return []
    used = _call_names(output)
    outside = sorted({name for name in used if name not in set(allowed)})
    return [
        Evaluation(
            name="gen_tool_allowed",
            value=0.0 if outside or not used else 1.0,
            data_type="BOOLEAN",
            comment=f"called {used or 'nothing'}, accepted {sorted(allowed)}"
            + (f"; outside the set: {outside}" if outside else ""),
        )
    ]


def forbidden_tools(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Did it avoid the tools this turn must not use."""
    forbidden = set(rule_of(expected_output).get("forbidden_tools") or [])
    if not forbidden:
        return []
    used = set(_call_names(output))
    offending = sorted(used & forbidden)
    return [
        Evaluation(
            name="gen_no_forbidden_tool",
            value=0.0 if offending else 1.0,
            data_type="BOOLEAN",
            comment=f"used {offending}" if offending else f"avoided {sorted(forbidden)}",
        )
    ]


def stopped_cleanly(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """A turn expected to finish must not ask for another tool, and a turn
    expected to continue must not stop early."""
    expected = rule_of(expected_output).get("stop")
    if expected is None:
        return []
    finished = not _calls(output)
    return [
        Evaluation(
            name="gen_stopped_cleanly",
            value=1.0 if finished == expected else 0.0,
            data_type="BOOLEAN",
            comment=f"expected {'a final answer' if expected else 'another tool call'}, "
            f"got {'a final answer' if finished else 'a tool call'}",
        )
    ]


def json_arguments_parse(*, output: Any = None, **_: Any) -> list[Evaluation]:
    """Tool arguments that carry JSON have to be parseable JSON."""
    payloads = [
        value
        for call in _calls(output)
        for key, value in (call.get("input") or {}).items()
        if key in {"content", "new_content", "contents"} and isinstance(value, str)
    ]
    if not payloads:
        return []
    bad = []
    for payload in payloads:
        stripped = payload.strip()
        if not stripped.startswith(("{", "[")):
            continue
        try:
            json.loads(stripped)
        except json.JSONDecodeError as error:
            bad.append(str(error))
    return [
        Evaluation(
            name="gen_json_parses",
            value=0.0 if bad else 1.0,
            data_type="BOOLEAN",
            comment="; ".join(bad) if bad else f"{len(payloads)} payload(s) parse",
        )
    ]


ITEM_EVALUATORS = [
    tool_choice,
    allowed_tools,
    tool_arguments,
    forbidden_tools,
    stopped_cleanly,
    json_arguments_parse,
]


def tool_catalog(names: list[str] | None = None) -> list[dict[str, Any]]:
    """The real tool catalog the loop offers, optionally narrowed."""
    from agents.graph.nodes.agentic_loop_node import _build_registry

    schemas = _build_registry().to_schema()
    if names is None:
        return schemas
    by_name = {schema["name"]: schema for schema in schemas}
    missing = [name for name in names if name not in by_name]
    if missing:
        raise ValueError(f"unknown tool(s) {missing}; the registry has {sorted(by_name)}")
    return [by_name[name] for name in names]


def actor_system_prompt(goal: str, *, allow_app_changes: bool = True) -> str:
    """The real loop system prompt, composed for one goal."""
    from agents.core.context import SessionContext, build_system_prompt

    return build_system_prompt(
        SessionContext(
            session_id="generation-experiment",
            repo_path="/tmp/generation-experiment",
            user_goal=goal,
            allow_app_changes=allow_app_changes,
        )
    )


def resolve_system_prompt(item_input: dict[str, Any]) -> str:
    """The prompt an item runs with."""
    inline = item_input.get("system_prompt")
    if inline:
        return inline

    trace = item_input.get("system_prompt_trace")
    if trace:
        from .dataset_sync import DATASETS_DIR
        from .harvest import SYSTEM_PROMPTS_FILE

        path = DATASETS_DIR / SYSTEM_PROMPTS_FILE
        if not path.exists():
            raise ValueError(f"{SYSTEM_PROMPTS_FILE} is missing; rebuild it with `python -m benchmarks.harvest`")
        prompts = json.loads(path.read_text(encoding="utf-8"))
        if not prompts.get(trace):
            raise ValueError(
                f"no session prompt recorded for trace {trace}; rebuild with `python -m benchmarks.harvest`"
            )
        return prompts[trace]

    goal = item_input.get("goal")
    if not goal:
        raise ValueError("an item needs system_prompt, system_prompt_trace or goal")
    return actor_system_prompt(goal, allow_app_changes=item_input.get("allow_app_changes", True))


def adapter_for(model: str, max_tokens: int | None = None) -> Any:
    """An adapter for one named model, bypassing role selection."""
    from agents.core.llm_adapter import (
        _ANTHROPIC_MAX_TOKENS,
        AnthropicAdapter,
        OpenAIAdapter,
        _is_claude_model,
    )

    if _is_claude_model(model):
        return AnthropicAdapter(
            model=model,
            max_tokens=max_tokens if max_tokens is not None else _ANTHROPIC_MAX_TOKENS,
        )
    return OpenAIAdapter(model=model, max_tokens=max_tokens)


@dataclass
class GenerationTask:
    """One decision point, one model turn, no tool execution."""

    role: str = "actor"
    max_tokens: int | None = None
    model: str | None = None

    async def __call__(self, *, item: Any, **_: Any) -> dict[str, Any]:
        from .agent_task import item_field

        item_input = item_field(item, "input") or {}
        role = item_input.get("role") or self.role
        adapter = (
            adapter_for(self.model, self.max_tokens) if self.model else build_adapter(role, max_tokens=self.max_tokens)
        )
        reply = await adapter.chat(
            messages=conversation_from_item(item_input),
            system_prompt=resolve_system_prompt(item_input),
            tool_schemas=tool_catalog(item_input.get("tools")),
        )
        turn = turn_from_reply(reply)
        output = turn.as_output()
        output["model"] = adapter.model
        output["role"] = role
        return output


FAILURE_MODES = (
    "correct",
    "off_contract",
    "missing_tool",
    "forbidden_tool",
    "tool_outside_set",
    "stopped_early",
    "did_not_stop",
)


def required_tools(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """How much of what the turn had to do it actually did."""
    required = rule_of(expected_output).get("required_tools")
    if not required:
        return []
    used = set(_call_names(output))
    missing = sorted(set(required) - used)
    return [
        Evaluation(
            name="gen_required_tools",
            value=round((len(set(required)) - len(missing)) / len(set(required)), 4),
            data_type="NUMERIC",
            comment=f"called {sorted(used) or 'nothing'}"
            + (f"; missing {missing}" if missing else "; nothing missing"),
        )
    ]


def failure_mode(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Which way the turn went wrong, as a category."""
    rule = rule_of(expected_output)
    if not rule:
        return []
    calls = _calls(output)
    if not isinstance(output, dict):
        mode = "off_contract"
    else:
        used = set(_call_names(output))
        forbidden = set(rule.get("forbidden_tools") or [])
        allowed = set(rule.get("allowed_tools") or [])
        required = set(rule.get("required_tools") or [])
        stop = rule.get("stop")
        if used & forbidden:
            mode = "forbidden_tool"
        elif allowed and used - allowed:
            mode = "tool_outside_set"
        elif required - used:
            mode = "missing_tool"
        elif stop is True and calls:
            mode = "did_not_stop"
        elif stop is False and not calls:
            mode = "stopped_early"
        else:
            mode = "correct"
    return [
        Evaluation(
            name="gen_failure_mode",
            value=mode,
            # CATEGORICAL, or Langfuse stores 0.
            data_type="CATEGORICAL",
            comment=f"{len(calls)} call(s): {_call_names(output) or 'none'}",
        )
    ]


def _components_in(node: Any) -> Iterator[dict[str, Any]]:
    if not isinstance(node, (dict, list)):
        return
    for value in node.values() if isinstance(node, dict) else node:
        if isinstance(value, (dict, list)):
            yield from _components_in(value)
    if isinstance(node, dict) and isinstance(node.get("type"), str) and "id" in node:
        yield node


def written_components(output: Any) -> list[dict[str, Any]]:
    """Every component this turn wrote, read out of the write_file payloads."""
    components = []
    for call in _calls(output):
        if call.get("name") != "write_file":
            continue
        content = (call.get("input") or {}).get("content")
        if not isinstance(content, str):
            continue
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            continue
        components.extend(_components_in(parsed))
    return components


def _carries(component: dict[str, Any], prop: str, required: Any) -> bool:
    if prop not in component:
        return False
    value = component[prop]
    if isinstance(required, bool) or isinstance(value, bool):
        return value is required
    return value == required


def content_pairings(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Do the components this turn wrote carry the property values their bindings need."""
    required = rule_of(expected_output).get("content_pairings") or []
    if not required:
        return []

    components = written_components(output)
    total = 0
    satisfied = 0
    comments = []
    for pairing in required:
        component_type = pairing["component"]
        prop = pairing["property"]
        value = pairing["value"]
        written = [c for c in components if c.get("type") == component_type]
        setting = [c for c in written if _carries(c, prop, value)]
        if not written:
            continue
        total += len(written)
        satisfied += len(setting)
        comments.append(
            f"{len(setting)}/{len(written)} {component_type}(s) set {prop} to "
            f"{json.dumps(value)}" + ("" if len(setting) == len(written) else f"; {pairing['consequence']}")
        )
    if not total:
        return []
    return [
        Evaluation(
            name="gen_content_pairings",
            value=round(satisfied / total, 4),
            data_type="NUMERIC",
            comment="; ".join(comments),
        )
    ]


ITEM_EVALUATORS.extend([required_tools, failure_mode, content_pairings])


SCORE_NAMES = (
    "gen_content_pairings",
    "gen_failure_mode",
    "gen_json_parses",
    "gen_no_forbidden_tool",
    "gen_required_tools",
    "gen_stopped_cleanly",
    "gen_tool_allowed",
    "gen_tool_arguments",
    "gen_tool_choice",
)
