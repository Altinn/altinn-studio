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


def _summarise_patch(
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
                file_path = op.get("file", "?")
                operation = op.get("operation") or op.get("op", "?")
                lines.append(f"  - [{operation}] {file_path}")

    return "\n".join(lines) if lines else "(no changes recorded)"


def _parse_judge_response(response: str) -> tuple[bool, str]:
    """Extract (passed, reasoning) from the judge's JSON response."""
    try:
        match = re.search(r"\{.*\}", response.strip(), re.DOTALL)
        if match:
            data = json.loads(match.group())
            passed = int(data.get("score", 0)) == 1
            reasoning = str(data.get("reasoning", ""))
            return passed, reasoning
    except Exception as e:
        log.warning("Failed to parse implementation_match judge response: %s | raw: %.200s", e, response)
    return False, f"Parse error — raw response: {response[:200]}"


async def run_implementation_judge(
    user_goal: str,
    implementation_plan: Optional[Any],
    step_plan: Optional[str],
    changed_files: List[str],
    patch_data: Optional[Dict[str, Any]],
    trace_id: str,
) -> None:
    """Evaluate implementation_match and write a boolean score to Langfuse.

    Compares the agent's plan against a summary of the actual changes it made
    (files touched and operations performed). Scores 1 if the implementation
    covers the core steps in the plan, 0 otherwise.

    Only called when intent_match has already passed, so we know the plan
    itself was aligned with the user's goal.
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

    changes_summary = _summarise_patch(changed_files, patch_data)

    user_message = (
        "## User's original goal\n"
        f"{user_goal}\n\n"
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
