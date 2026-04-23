"""LLM-as-a-judge evaluation for the implementation_match dimension."""
import json
import re
from typing import Any, Dict, List, Optional

from agents.prompts.loader import get_prompt_with_langfuse
from agents.services.llm import LLMClient
from shared.config.base_config import get_config
from shared.utils.langfuse_utils import score_validation
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)
config = get_config()

_JUDGE_PROMPT_NAME = "implementation_match"
_MAX_PLAN_CHARS = 4000
_MAX_CHANGES_CHARS = 3000
_MAX_SOURCES_CHARS = 6000


def _describe_operation(op: Dict[str, Any]) -> str:
    """Build a one-line description of a single patch operation with key details."""
    file_path = op.get("file", "?")
    operation = op.get("operation") or op.get("op", "?")
    detail = ""

    if operation == "insert_json_array_item":
        item = op.get("item") or {}
        parts = []
        if item.get("type"):
            parts.append(f"type={item['type']}")
        if item.get("id"):
            parts.append(f"id={item['id']}")
        bindings = item.get("dataModelBindings")
        if isinstance(bindings, dict) and bindings:
            bound = ", ".join(f"{k}={v}" for k, v in bindings.items())
            parts.append(f"binds={bound}")
        if "value" in item:
            parts.append(f"value={str(item['value'])[:60]}")
        if parts:
            detail = f" → {', '.join(parts)}"

    elif operation == "insert_json_property":
        key = op.get("key")
        if key:
            detail = f" → key={key}"

    elif operation in ("insert_text_at_pattern", "replace_text"):
        text = op.get("text") or op.get("new_text") or ""
        if text:
            detail = f" → {text.replace(chr(10), ' ')[:80]}"

    return f"  - [{operation}] {file_path}{detail}"


def _summarize_patch(
    changed_files: List[str],
    patch_data: Optional[Dict[str, Any]],
) -> str:
    """Build a compact, human-readable summary of what was actually changed."""
    lines: List[str] = []

    if changed_files:
        lines.append("Changed files:")
        for f in changed_files:
            lines.append(f"  - {f}")

    if patch_data:
        operations = patch_data.get("changes", [])
        if operations:
            lines.append("\nOperations performed:")
            for op in operations:
                lines.append(_describe_operation(op))

    return "\n".join(lines) if lines else "(no changes recorded)"


def _parse_judge_response(response: str) -> tuple[bool | None, str]:
    """Extract (passed, reasoning) from the judge's JSON response.

    Returns None for passed when the output is unparsable, so callers can
    skip score_validation rather than recording a misleading failing score.
    """
    try:
        match = re.search(r"\{.*\}", response.strip(), re.DOTALL)
        if match:
            data = json.loads(match.group())
            raw_score = data.get("score")
            if raw_score is None:
                return None, f"Missing score field — raw response: {response[:200]}"
            score = int(raw_score)
            if score not in (0, 1):
                return None, f"Invalid score value — raw response: {response[:200]}"
            reasoning = str(data.get("reasoning", ""))
            return score == 1, reasoning
    except Exception as e:
        log.warning("Failed to parse implementation_match judge response: %s | raw: %.200s", e, response)
    return None, f"Parse error — raw response: {response[:200]}"


async def run_implementation_judge(
    implementation_plan: Optional[Any],
    step_plan: Optional[str],
    changed_files: List[str],
    patch_data: Optional[Dict[str, Any]],
    trace_id: str,
    planning_guidance: Optional[str] = None,
) -> None:
    """Evaluate implementation_match and write a boolean score to Langfuse.

    Compares the agent's plan against a summary of the actual changes it made
    (files touched and operations performed). Scores 1 if the implementation
    covers the core steps in the plan, 0 otherwise.

    Only called when intent_match has already passed, so we know the plan
    itself was aligned with the user's goal.

    Args:
        implementation_plan: Structured plan produced by the planning tool (dict/list).
            Preferred over step_plan when available.
        step_plan: High-level one-line description of what the agent will do (legacy field).
            Used as fallback when implementation_plan is absent.
        changed_files: Paths of files written to disk by the actor node.
        patch_data: Raw patch dict containing a 'changes' list of file operations
            (operation type + file path) applied by the actor node.
        trace_id: Langfuse trace ID to attach the score to.
        planning_guidance: Altinn documentation and repo context the agent had access to.
            Passed as background knowledge so the judge can interpret file changes correctly.
    """
    if not changed_files and not patch_data:
        log.warning("implementation_match: no changed_files or patch_data — skipping evaluation")
        return

    plan_text: str
    if implementation_plan:
        raw = (
            json.dumps(implementation_plan, ensure_ascii=False)
            if isinstance(implementation_plan, (dict, list))
            else str(implementation_plan)
        )
        plan_text = raw[:_MAX_PLAN_CHARS]
    elif step_plan:
        plan_text = step_plan[:_MAX_PLAN_CHARS]
    else:
        log.warning("implementation_match: no plan available — skipping evaluation")
        return

    try:
        system_prompt, lf_prompt = get_prompt_with_langfuse(_JUDGE_PROMPT_NAME, local_path="llm-as-a-judge/implementation_match")
    except FileNotFoundError:
        log.error("Judge prompt '%s' not found — skipping implementation_match", _JUDGE_PROMPT_NAME)
        return

    changes_summary = _summarize_patch(changed_files, patch_data)

    sources_section = (
        f"## Repository context (Altinn documentation available to the agent)\n"
        f"{planning_guidance[:_MAX_SOURCES_CHARS]}\n\n"
        if planning_guidance
        else ""
    )

    user_message = (
        f"{sources_section}"
        "## Agent's plan\n"
        f"{plan_text}\n\n"
        "## Actual implementation (files and operations)\n"
        f"{changes_summary[:_MAX_CHANGES_CHARS]}\n\n"
        "Evaluate whether the actual implementation matches the agent's plan. "
        "Respond with JSON only."
    )

    client = LLMClient(role="reviewer")
    try:
        response = await client.call_async(
            system_prompt=system_prompt,
            user_prompt=user_message,
            langfuse_prompt=lf_prompt,
        )
    except Exception as e:
        log.warning("implementation_match judge LLM call failed: %s", e)
        return

    passed, reasoning = _parse_judge_response(response)
    if passed is None:
        log.warning("implementation_match: unparsable judge output — skipping score")
        return

    score_validation(
        name="implementation_match",
        passed=passed,
        trace_id=trace_id,
        config_id=config.LANGFUSE_SCORE_CONFIG_IMPLEMENTATION_MATCH or None,
        comment=reasoning,
    )
    log.info(
        "implementation_match score=%d for trace %s | %.100s",
        int(passed),
        trace_id,
        reasoning,
    )
