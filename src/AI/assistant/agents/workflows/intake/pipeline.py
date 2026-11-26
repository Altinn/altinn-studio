"""Intake workflow pipeline that turns the user's goal into a high-level plan."""

from __future__ import annotations

from agents.prompts import get_prompt_with_langfuse, render_template
from agents.services.llm import LLMClient
from shared.models import AgentAttachment
from shared.utils.langfuse_utils import trace_generation
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


def run_intake_pipeline(
    repo_path: str,
    user_goal: str,
    *,
    attachments: list[AgentAttachment] | None = None,
    conversation_history: list | None = None,
) -> str:
    """Execute the intake workflow and return the plan."""

    system_prompt, lf_prompt = get_prompt_with_langfuse("intake_planning")
    user_prompt = render_template("intake_planning_user", user_goal=user_goal)

    # Add conversation history context for follow-up requests
    if conversation_history and len(conversation_history) > 0:
        history_context = "\n\nPREVIOUS CONVERSATION CONTEXT:\n"
        for msg in conversation_history[-6:]:  # Last 3 exchanges (6 messages)
            role = "User" if msg.role == "user" else "Assistant"
            content = msg.content[:500] + "..." if len(msg.content) > 500 else msg.content
            history_context += f"{role}: {content}\n\n"
        history_context += (
            "Use this context to understand what has already been done and what the user is asking for now.\n"
        )
        user_prompt = history_context + user_prompt

    # Intake only produces a high-level task description; the spec agent
    # handles attachment parsing.  Sending the PDF/image here would burn
    # ~150k input tokens per call for no signal — we pass attachment
    # metadata (name + mime) so the planner knows one exists, nothing more.
    attachment_summary = _summarize_attachments(attachments)
    if attachment_summary:
        user_prompt = f"{user_prompt}\n\nATTACHMENTS PRESENT (content handled by spec agent):\n{attachment_summary}"

    client = LLMClient(role="planner")
    with trace_generation(
        "intake_planning_llm",
        model=client.model,
        input={"user_goal": user_goal},
        metadata={"has_attachments": bool(attachments), **client.get_model_metadata()},
    ) as span:
        response = client.call_sync(system_prompt, user_prompt, langfuse_prompt=lf_prompt)
        span.update(output={"response": response[:5000]})

    return response.strip()


def _summarize_attachments(attachments: list[AgentAttachment] | None) -> str:
    if not attachments:
        return ""
    return "\n".join(f"- {a.name} ({a.mime_type})" for a in attachments)
