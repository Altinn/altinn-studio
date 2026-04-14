"""LLM-as-a-judge evaluation for the no_security_issues dimension."""
import json
import re
from typing import Any

from agents.prompts.loader import get_prompt_with_langfuse
from agents.services.llm import LLMClient
from shared.config.base_config import get_config
from shared.utils.langfuse_utils import score_validation
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)
config = get_config()

_JUDGE_PROMPT_NAME = "no_security_issues"
_MAX_PATCH_CHARS = 8000


def _parse_judge_response(response: str) -> tuple[bool | None, str]:
    """Extract (passed, reasoning) from the judge's JSON response."""
    try:
        match = re.search(r"\{.*\}", response.strip(), re.DOTALL)
        if match:
            data = json.loads(match.group())
            raw_score = data.get("score")
            if raw_score is None:
                return None, f"Missing score field — raw response: {response[:200]}"
            score = int(raw_score)
            if score not in (0, 1):
                return None, f"Invalid score field — raw response: {response[:200]}"
            passed = score == 1
            reasoning = str(data.get("reasoning", ""))
            return passed, reasoning
    except Exception as e:
        log.warning("Failed to parse no_security_issues judge response: %s | raw: %.200s", e, response)
    return None, f"Parse error — raw response: {response[:200]}"


def _format_patch(patch_data: Any) -> str:
    """Serialize patch_data to a readable string for the judge."""
    if not patch_data:
        return ""
    if isinstance(patch_data, str):
        return patch_data
    try:
        return json.dumps(patch_data, ensure_ascii=False, indent=2, default=str)
    except (ValueError, TypeError):
        # Circular references or non-serializable objects — extract what we can
        changes = patch_data.get("changes", []) if isinstance(patch_data, dict) else []
        summary = patch_data.get("summary", "") if isinstance(patch_data, dict) else ""
        safe = {"summary": str(summary), "changes": []}
        for c in changes:
            if isinstance(c, dict):
                safe["changes"].append({k: str(v) for k, v in c.items() if not isinstance(v, (dict, list))})
        return json.dumps(safe, ensure_ascii=False, indent=2)


async def run_security_judge(
    user_goal: str,
    patch_data: Any,
    trace_id: str,
) -> None:
    """Evaluate no_security_issues and write a boolean score to Langfuse.

    Checks whether the generated code patch introduces security vulnerabilities.
    Scores 1 if no security issues are found, 0 if issues are detected.

    Args:
        user_goal: The original user request.
        patch_data: The generated patch or changed file contents from the agent.
        trace_id: Langfuse trace ID to attach the score to.
    """
    patch_text = _format_patch(patch_data)
    if not patch_text:
        log.warning("no_security_issues: no patch_data available — skipping evaluation")
        return

    try:
        system_prompt, lf_prompt = get_prompt_with_langfuse(_JUDGE_PROMPT_NAME, local_path="llm-as-a-judge/no_security_issues")
    except FileNotFoundError:
        log.error("Judge prompt '%s' not found — skipping no_security_issues", _JUDGE_PROMPT_NAME)
        return

    user_message = (
        "## User's goal\n"
        f"{user_goal}\n\n"
        "## Generated code patch\n"
        f"{patch_text[:_MAX_PATCH_CHARS]}\n\n"
        "Evaluate whether the code patch introduces any security vulnerabilities. "
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
        log.warning("no_security_issues judge LLM call failed: %s", e)
        return

    passed, reasoning = _parse_judge_response(response)
    if passed is None:
        log.warning("no_security_issues: unparsable judge output — skipping score")
        return

    score_validation(
        name="no_security_issues",
        passed=passed,
        trace_id=trace_id,
        config_id=config.LANGFUSE_SCORE_CONFIG_SECURITY or None,
        comment=reasoning,
    )
    log.info(
        "no_security_issues score=%d for trace %s | %.100s",
        int(passed),
        trace_id,
        reasoning,
    )
