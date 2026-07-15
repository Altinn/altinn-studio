"""LLM-as-a-judge evaluation for the no_irrelevant_responses dimension."""
import json
import re

from agents.prompts.loader import get_prompt_with_langfuse
from agents.services.llm import LLMClient
from shared.config.base_config import get_config
from shared.utils.langfuse_utils import score_validation
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)
config = get_config()

_JUDGE_PROMPT_NAME = "no_irrelevant_responses"


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
                return None, f"Invalid score value — raw response: {response[:200]}"
            reasoning = str(data.get("reasoning", ""))
            return score == 1, reasoning
    except Exception as e:
        log.warning("Failed to parse no_irrelevant_responses judge response: %s | raw: %.200s", e, response)
    return None, f"Parse error — raw response: {response[:200]}"


async def run_no_irrelevant_responses_judge(
    user_goal: str,
    agent_response: str,
    trace_id: str,
) -> None:
    """Evaluate no_irrelevant_responses and write a boolean score to Langfuse.

    Checks whether the assistant correctly declined out-of-scope questions
    (non-Altinn topics) instead of answering them, and did not wrongly
    decline genuine Altinn-related questions. Scores 1 if handled correctly,
    0 otherwise.
    """
    if not agent_response:
        log.warning("no_irrelevant_responses: no agent_response available — skipping evaluation")
        return

    try:
        system_prompt, lf_prompt = get_prompt_with_langfuse(
            _JUDGE_PROMPT_NAME, local_path="llm-as-a-judge/no_irrelevant_responses"
        )
    except FileNotFoundError:
        log.error("Judge prompt '%s' not found — skipping no_irrelevant_responses", _JUDGE_PROMPT_NAME)
        return

    user_message = (
        "## User's question\n"
        f"{user_goal}\n\n"
        "## Assistant's response\n"
        f"{agent_response}\n\n"
        "Evaluate whether the assistant handled the question's relevance correctly. "
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
        log.warning("no_irrelevant_responses judge LLM call failed: %s", e)
        return

    passed, reasoning = _parse_judge_response(response)
    if passed is None:
        log.warning("no_irrelevant_responses: unparsable judge output — skipping score")
        return

    score_validation(
        name="no_irrelevant_responses",
        passed=passed,
        trace_id=trace_id,
        config_id=config.LANGFUSE_SCORE_CONFIG_NO_IRRELEVANT_RESPONSES or None,
        comment=reasoning,
    )
    log.info(
        "no_irrelevant_responses score=%d for trace %s | %.100s",
        int(passed),
        trace_id,
        reasoning,
    )
