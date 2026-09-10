"""Scoring what a model generates, without running the tools it asks for."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Iterator

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
    calls = [
        {"name": block.name, "input": block.input}
        for block in reply.content
        if isinstance(block, ToolUseBlock)
    ]
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


def tool_arguments(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
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
            comment="all expected arguments match"
            if not wrong
            else "; ".join(f"{k}: {v}" for k, v in wrong.items()),
        )
    ]


def allowed_tools(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
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


def forbidden_tools(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
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


def stopped_cleanly(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
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
            raise ValueError(
                f"{SYSTEM_PROMPTS_FILE} is missing; rebuild it with "
                "`python -m benchmarks.harvest`"
            )
        prompts = json.loads(path.read_text(encoding="utf-8"))
        if not prompts.get(trace):
            raise ValueError(
                f"no session prompt recorded for trace {trace}; rebuild with "
                "`python -m benchmarks.harvest`"
            )
        return prompts[trace]

    goal = item_input.get("goal")
    if not goal:
        raise ValueError("an item needs system_prompt, system_prompt_trace or goal")
    return actor_system_prompt(
        goal, allow_app_changes=item_input.get("allow_app_changes", True)
    )


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
            adapter_for(self.model, self.max_tokens)
            if self.model
            else build_adapter(role, max_tokens=self.max_tokens)
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


GOAL_SENTINEL = "__GOAL__"

DECISION_CONTRACT = """
## How to answer in this evaluation

You are being evaluated on one turn, and the tools are not connected. Do not
narrate. Reply with JSON only, in exactly this shape:

{
  "tool_calls": [
    {"tool": "the tool to call", "arguments_json": "{\"the arguments\": \"...\"}"}
  ],
  "done": false,
  "text": "what you would say to the developer, or an empty string"
}

Call as many tools in one turn as the work needs, exactly as you would normally:
reading four files and writing three is one turn, not seven. Return an empty
`tool_calls` list and `done: true` only when the work is finished or the
conversation calls for an answer rather than an action.

`arguments_json` is a JSON *string* rather than an object, because a free-form
object in the schema is coerced to always-empty.

The tools below are the full catalog, described the same way the running agent
sees them. Earlier turns in this conversation are written in this same JSON
shape, and a `[tool_result]:` message is what those tools returned. Answer in
that shape too, with no prose around it.
"""

# arguments is a string; a nested object permits no keys.
DECISION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["tool_calls", "done", "text"],
    "properties": {
        "tool_calls": {
            "type": "array",
            "description": "Every tool to call this turn, in order. Empty when done.",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["tool", "arguments_json"],
                "properties": {
                    "tool": {"type": "string"},
                    "arguments_json": {
                        "type": "string",
                        "description": "Arguments as a JSON object encoded in a "
                        "string, for example {\"path\": \"App/ui/form/layouts/Side1.json\"}.",
                    },
                },
            },
        },
        "done": {
            "type": "boolean",
            "description": "True only when the work is finished or the turn calls "
            "for an answer rather than an action.",
        },
        "text": {
            "type": "string",
            "description": "What you would say to the developer, or an empty string.",
        },
    },
}


def render_tool_catalog(schemas: list[dict[str, Any]] | None = None) -> str:
    """The catalog as text, for the path that cannot pass tool definitions."""
    schemas = schemas if schemas is not None else tool_catalog()
    blocks = []
    for schema in schemas:
        blocks.append(
            f"### {schema['name']}\n{schema['description'].strip()}\n\n"
            f"Arguments (JSON Schema):\n```json\n"
            f"{json.dumps(schema.get('input_schema') or {}, ensure_ascii=False)}\n```"
        )
    return "## Tools\n\n" + "\n\n".join(blocks)


def ui_system_prompt() -> str:
    """The loop system prompt with the goal left as a Langfuse variable."""
    prompt = actor_system_prompt(GOAL_SENTINEL)
    if GOAL_SENTINEL not in prompt:
        raise RuntimeError("the system prompt no longer carries the goal verbatim")
    return (
        prompt.replace(GOAL_SENTINEL, "{{goal}}")
        + "\n\n"
        + render_tool_catalog().strip()
        + "\n"
        + DECISION_CONTRACT
    )


def as_chat_messages(conversation: list[dict[str, Any]]) -> list[dict[str, str]]:
    """The conversation flattened to role/content, for a placeholder."""
    messages = []
    for entry in conversation:
        role = entry.get("role")
        if role == "user" and "tool_results" in entry:
            body = "\n\n".join(
                f"[tool_result{' err' if result.get('is_error') else ''}]: {result['content']}"
                for result in entry["tool_results"]
            )
            messages.append({"role": "user", "content": body})
        elif role == "user":
            messages.append({"role": "user", "content": entry["text"]})
        elif role == "assistant":
            calls = entry.get("tool_calls") or []
            messages.append(
                {
                    "role": "assistant",
                    "content": json.dumps(
                        {
                            "tool_calls": [
                                {
                                    "tool": call["name"],
                                    "arguments_json": json.dumps(
                                        call.get("input") or {}, ensure_ascii=False
                                    ),
                                }
                                for call in calls
                            ],
                            "done": not calls,
                            "text": entry.get("text") or "",
                        },
                        ensure_ascii=False,
                    ),
                }
            )
        else:
            raise ValueError(f"unknown role {role!r} in a conversation entry")
    return messages


def decoded_arguments(decision: dict[str, Any]) -> dict[str, Any]:
    """The arguments of a UI decision, whichever form they arrived in."""
    encoded = decision.get("arguments_json")
    if isinstance(encoded, str) and encoded.strip():
        try:
            parsed = json.loads(encoded)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    arguments = decision.get("arguments")
    return arguments if isinstance(arguments, dict) else {}


def ui_output_as_tool_calls(decision: dict[str, Any]) -> dict[str, Any]:
    """A UI decision in the same shape the SDK task returns."""
    listed = decision.get("tool_calls")
    if isinstance(listed, list):
        calls = [
            {"name": call.get("tool"), "input": decoded_arguments(call)}
            for call in listed
            if isinstance(call, dict) and call.get("tool")
        ]
    else:
        tool = decision.get("tool")
        calls = [{"name": tool, "input": decoded_arguments(decision)}] if tool else []
    return {
        TOOL_CALLS_KEY: calls,
        TEXT_KEY: decision.get("text") or "",
        "stop_reason": "end_turn" if decision.get("done") else "tool_use",
    }


FAILURE_MODES = (
    "correct",
    "off_contract",
    "missing_tool",
    "forbidden_tool",
    "tool_outside_set",
    "stopped_early",
    "did_not_stop",
)


def required_tools(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
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


def failure_mode(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
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


def content_pairings(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
    """Do the components this turn wrote carry the properties their bindings need."""
    required: list[tuple[str, str, str]] = []
    if rule_of(expected_output).get("datepicker_sets_timestamp"):
        required.append(("Datepicker", "timeStamp", "the page will not render"))
    if not required:
        return []

    components = written_components(output)
    total = 0
    satisfied = 0
    comments = []
    for component_type, prop, consequence in required:
        written = [c for c in components if c.get("type") == component_type]
        setting = [c for c in written if prop in c]
        if not written:
            continue
        total += len(written)
        satisfied += len(setting)
        comments.append(
            f"{len(setting)}/{len(written)} {component_type}(s) set {prop}"
            + ("" if len(setting) == len(written) else f"; {consequence}")
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
