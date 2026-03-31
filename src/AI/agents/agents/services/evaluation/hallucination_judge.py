"""LLM-as-a-judge evaluation for the no_hallucination dimension."""
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

_JUDGE_PROMPT_NAME = "llm-as-a-judge/no_hallucination_judge"
_MAX_SOURCE_CHARS = 8000
_MAX_RESPONSE_CHARS = 4000


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
        log.warning("Failed to parse no_hallucination judge response: %s | raw: %.200s", e, response)
    return None, f"Parse error — raw response: {response[:200]}"


def format_sources(sources: list[dict[str, Any]]) -> str:
    """Format a list of source dicts (title/url/preview) into readable text for the judge."""
    if not sources:
        return ""
    parts = []
    for s in sources:
        title = s.get("title", "Untitled")
        url = s.get("url", "")
        preview = s.get("preview", s.get("content", ""))
        parts.append(f"### {title}\n{url}\n{preview}")
    return "\n\n".join(parts)


async def run_hallucination_judge(
    user_goal: str,
    agent_response: str,
    sources: str,
    trace_id: str,
) -> None:
    """Evaluate no_hallucination and write a boolean score to Langfuse.

    Checks whether the agent's response or plan is grounded in the provided
    documentation. Scores 1 if grounded, 0 if hallucination detected.

    Args:
        user_goal: The original user request.
        agent_response: What the agent produced (plan text or chat response).
        sources: Documentation the agent had access to, as plain text.
        trace_id: Langfuse trace ID to attach the score to.
    """
    if not agent_response:
        log.warning("no_hallucination: no agent_response available — skipping evaluation")
        return

    if not sources:
        log.warning("no_hallucination: no sources available — skipping evaluation")
        return

    try:
        system_prompt, lf_prompt = get_prompt_with_langfuse(_JUDGE_PROMPT_NAME)
    except FileNotFoundError:
        log.error("Judge prompt '%s' not found — skipping no_hallucination", _JUDGE_PROMPT_NAME)
        return

    user_message = (
        "## User's goal\n"
        f"{user_goal}\n\n"
        "## Agent's response / plan\n"
        f"{agent_response[:_MAX_RESPONSE_CHARS]}\n\n"
        "## Available documentation / sources\n"
        f"{sources[:_MAX_SOURCE_CHARS]}\n\n"
        "Evaluate whether the agent's response is grounded in the provided documentation. "
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
        log.warning("no_hallucination judge LLM call failed: %s", e)
        return

    passed, reasoning = _parse_judge_response(response)
    if passed is None:
        log.warning("no_hallucination: unparsable judge output — skipping score")
        return

    score_validation(
        name="no_hallucination",
        passed=passed,
        trace_id=trace_id,
        config_id=config.LANGFUSE_SCORE_CONFIG_NO_HALLUCINATION or None,
        comment=reasoning,
    )
    log.info(
        "no_hallucination score=%d for trace %s | %.100s",
        int(passed),
        trace_id,
        reasoning,
    )
