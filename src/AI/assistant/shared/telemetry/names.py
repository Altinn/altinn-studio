"""The names of the telemetry this service writes itself.

docs/observability.md has the rules: the semantic conventions' names where they cover something, the shared
vocabulary's `altinn.` names, and `altinn.assistant.` for what only this service has.
"""

# The instrumentation scope of the service's own spans and metrics
SCOPE = "altinn.assistant"

# Semantic conventions
ENDUSER_ID = "enduser.id"
ERROR_TYPE = "error.type"
GEN_AI_CONVERSATION_ID = "gen_ai.conversation.id"
GEN_AI_OPERATION_NAME = "gen_ai.operation.name"
GEN_AI_PROVIDER_NAME = "gen_ai.provider.name"
GEN_AI_REQUEST_MODEL = "gen_ai.request.model"
GEN_AI_RESPONSE_MODEL = "gen_ai.response.model"
GEN_AI_RESPONSE_FINISH_REASONS = "gen_ai.response.finish_reasons"
GEN_AI_TOKEN_TYPE = "gen_ai.token.type"
GEN_AI_USAGE_INPUT_TOKENS = "gen_ai.usage.input_tokens"
GEN_AI_USAGE_OUTPUT_TOKENS = "gen_ai.usage.output_tokens"
GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS = "gen_ai.usage.cache_read.input_tokens"
GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS = "gen_ai.usage.cache_creation.input_tokens"
URL_FULL = "url.full"

GEN_AI_OPERATION_CHAT = "chat"
GEN_AI_PROVIDER_ANTHROPIC = "anthropic"
GEN_AI_PROVIDER_AZURE_OPENAI = "azure.ai.openai"
GEN_AI_PROVIDER_OPENAI = "openai"
GEN_AI_TOKEN_TYPE_INPUT = "input"
GEN_AI_TOKEN_TYPE_OUTPUT = "output"

GEN_AI_CLIENT_OPERATION_DURATION = "gen_ai.client.operation.duration"
GEN_AI_CLIENT_TOKEN_USAGE = "gen_ai.client.token.usage"

# Shared vocabulary
SERVICE_OWNER = "altinn.service_owner"
APP = "altinn.app"
REPO_TYPE = "altinn.repo_type"
REPO_TYPE_APP = "app"
SAMPLING = "altinn.studio.sampling"
SAMPLING_ALWAYS = "always"

WORKLOAD_START_TIME = "altinn.workload.start_time"

# This service. A run is one agent workflow, from POST /api/agent/start to the reply.
RUN_SPAN = "assistant.run"
RUN_DURATION = "altinn.assistant.run.duration"

RUN_MODE = "altinn.assistant.run.mode"
RUN_OUTCOME = "altinn.assistant.run.outcome"
RUN_ATTACHMENTS = "altinn.assistant.run.attachments"
RUN_CHANGED_FILES = "altinn.assistant.run.changed_files"
RUN_LOOP_TERMINATION = "altinn.assistant.run.loop_termination"
RUN_TURNS = "altinn.assistant.run.turns"
RUN_MODELS = "altinn.assistant.run.models"
RUN_MODEL_CALLS = "altinn.assistant.run.model_calls"
RUN_MODEL_DURATION = "altinn.assistant.run.model.duration"
RUN_TOOLS = "altinn.assistant.run.tools"
RUN_TOOL_CALLS = "altinn.assistant.run.tool_calls"
RUN_TOOL_ERRORS = "altinn.assistant.run.tool_errors"


def run_phase_duration(phase: str) -> str:
    """The attribute for the seconds a run spent in one phase, such as `gate` or `agentic_loop`."""
    return f"altinn.assistant.run.{phase}.duration"


# Values of RUN_MODE
RUN_MODE_CHAT = "chat"
RUN_MODE_WORKFLOW = "workflow"

# Values of RUN_OUTCOME
RUN_OUTCOME_COMPLETED = "completed"
RUN_OUTCOME_FAILED = "failed"
RUN_OUTCOME_DECLINED = "declined"
RUN_OUTCOME_REJECTED = "rejected"
RUN_OUTCOME_CANCELLED = "cancelled"
RUN_OUTCOME_ERROR = "error"
