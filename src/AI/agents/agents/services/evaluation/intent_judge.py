"""LLM-as-a-judge evaluation for the intent_match dimension."""
import json
import re
from typing import Optional

from agents.prompts.loader import get_prompt_with_langfuse
from agents.services.llm import LLMClient
from shared.config.base_config import get_config
from shared.utils.langfuse_utils import score_validation
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)
config = get_config()

_JUDGE_PROMPT_NAME = "llm-as-a-judge/intent_match_judge"


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
        log.warning("Failed to parse intent_match judge response: %s | raw: %.200s", e, response)
    return False, f"Parse error — raw response: {response[:200]}"


async def run_intent_judge(
    user_goal: str,
    agent_plan: Optional[str],
    trace_id: str,
) -> None:
    """Evaluate intent_match and write a boolean score to Langfuse.

    Compares the user's original goal against the agent's step_plan
    (its high-level description of what it will do). Scores 1 if the plan
    correctly captures the intent, 0 otherwise.
    """
    if not agent_plan:
        log.warning("intent_match: no agent_plan available — skipping evaluation")
        return

    try:
        system_prompt, lf_prompt = get_prompt_with_langfuse(_JUDGE_PROMPT_NAME)
    except FileNotFoundError:
        log.error("Judge prompt '%s' not found — skipping intent_match", _JUDGE_PROMPT_NAME)
        return

    user_message = (
        "## User's original goal\n"
        f"{user_goal}\n\n"
        "## Agent's plan (its interpretation of the goal)\n"
        f"{agent_plan}\n\n"
        "Evaluate whether the agent's plan correctly captures the user's intent. "
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
        log.warning("intent_match judge LLM call failed: %s", e)
        return

    passed, reasoning = _parse_judge_response(response)

    score_validation(
        name="intent_match",
        passed=passed,
        trace_id=trace_id,
        config_id=config.LANGFUSE_SCORE_CONFIG_INTENT_MATCH or None,
        comment=reasoning,
    )
    log.info(
        "intent_match score=%d for trace %s | %.100s",
        int(passed),
        trace_id,
        reasoning,
    )
