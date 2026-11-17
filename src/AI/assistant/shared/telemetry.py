"""Telemetry for operations: metrics, run spans and WARN or ERROR logs, exported over OTLP.

None of it holds what users write, model output or exception messages. Langfuse holds those.
"""

# Attribute names, from the semantic conventions where they cover the concept.
ERROR_TYPE = "error.type"
GEN_AI_REQUEST_MODEL = "gen_ai.request.model"
GEN_AI_RESPONSE_FINISH_REASONS = "gen_ai.response.finish_reasons"
GEN_AI_TOOL_NAME = "gen_ai.tool.name"
LANGFUSE_TRACE_ID = "altinn.assistant.langfuse.trace_id"
LANGFUSE_OBSERVATION_ID = "altinn.assistant.langfuse.observation_id"
PROMPT_NAME = "altinn.assistant.prompt.name"


def error_type(exc: BaseException) -> str:
    """The value of `error.type` for an exception: its class, never its message."""
    return type(exc).__qualname__
