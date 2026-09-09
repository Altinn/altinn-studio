"""Base configuration"""
import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    PROJECT_ROOT = Path(__file__).parent.parent.parent
    LOG_DIR = PROJECT_ROOT / "logs"

    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8071"))

    GITEA_BASE_URL = os.getenv("GITEA_BASE_URL", "http://host.docker.internal/repos")

    CORS_ORIGINS = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080",  # Alternative frontend port
        "http://studio.localhost" # Studio frontend
    ]


    AZURE_API_KEY = os.getenv("AZURE_API_KEY")
    AZURE_ANTHROPIC_API_KEY = os.getenv("AZURE_ANTHROPIC_API_KEY") or os.getenv("AZURE_API_KEY")
    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://altinn-studio-assistant.openai.azure.com/")
    # Anthropic is only on the older resource; the EU data zone one has OpenAI alone.
    AZURE_ANTHROPIC_ENDPOINT = os.getenv(
        "AZURE_ANTHROPIC_ENDPOINT",
        "https://rndlabaidemoss0618689180.services.ai.azure.com/anthropic/",
    )
    AZURE_API_VERSION = os.getenv("AZURE_API_VERSION", "2025-03-01-preview")
    AZURE_DEPLOYMENT_NAME = os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-5.4-mini")

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-5.4-mini")
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    # Reviews the eval report; not in the agent's path.
    LLM_MODEL_EVAL_JUDGE = os.getenv("LLM_MODEL_EVAL_JUDGE", "gpt-5.6-sol")
    LLM_REASONING_EFFORT = os.getenv("LLM_REASONING_EFFORT", "low")


    LLM_MODEL_PLANNER = os.getenv("LLM_MODEL_PLANNER", "gpt-5.6-sol")
    LLM_TEMPERATURE_PLANNER = os.getenv("LLM_TEMPERATURE_PLANNER")  # None → model default

    LLM_MODEL_TOOL_PLANNER = os.getenv("LLM_MODEL_TOOL_PLANNER", "gpt-5.6-sol")
    LLM_TEMPERATURE_TOOL_PLANNER = os.getenv("LLM_TEMPERATURE_TOOL_PLANNER")
    LLM_TOOL_PLANNER_USE_COMPLETIONS = os.getenv("LLM_TOOL_PLANNER_USE_COMPLETIONS", "false").lower() == "true"
    LLM_TOOL_PLANNER_USE_RESPONSES = os.getenv("LLM_TOOL_PLANNER_USE_RESPONSES", "false").lower() == "true"

    LLM_MODEL_ACTOR = os.getenv("LLM_MODEL_ACTOR", "gpt-5.6-terra")

    LLM_MODEL_REVIEWER = os.getenv("LLM_MODEL_REVIEWER", "gpt-5.6-sol")
    LLM_TEMPERATURE_REVIEWER = float(os.getenv("LLM_TEMPERATURE_REVIEWER", "0.0"))

    LLM_MODEL_ASSISTANT = os.getenv("LLM_MODEL_ASSISTANT", "gpt-5.6-sol")
    LLM_TEMPERATURE_ASSISTANT = os.getenv("LLM_TEMPERATURE_ASSISTANT")  # None → model default

    PREVIEW_CHECK_ENABLED = os.getenv("PREVIEW_CHECK_ENABLED", "false").lower() == "true"
    PREVIEW_STUDIO_BASE_URL = os.getenv("PREVIEW_STUDIO_BASE_URL", "http://studio.localhost")
    PREVIEW_STUDIO_USER = os.getenv("PREVIEW_STUDIO_USER", "localgiteaadmin")
    PREVIEW_HOST_RESOLVER_RULES = os.getenv("PREVIEW_HOST_RESOLVER_RULES", "")

    _DEFAULT_ATTACHMENTS_PATH = Path(tempfile.gettempdir()) / "altinity_agent_attachments"
    ATTACHMENTS_ROOT = Path(os.getenv("AGENT_ATTACHMENTS_PATH", str(_DEFAULT_ATTACHMENTS_PATH)))

    LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
    LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
    LANGFUSE_HOST = os.getenv("LANGFUSE_BASE_URL", "https://langfuse.digdir.cloud")
    LANGFUSE_ENABLED = os.getenv("LANGFUSE_ENABLED", "true").lower() == "true"
    LANGFUSE_RELEASE = os.getenv("LANGFUSE_RELEASE", "assistant-agents")
    LANGFUSE_ENVIRONMENT = os.getenv("LANGFUSE_ENVIRONMENT", ENVIRONMENT)
    LANGFUSE_TRACE_RETENTION_DAYS = int(os.getenv("LANGFUSE_TRACE_RETENTION_DAYS", "90"))

    LANGFUSE_SCORE_CONFIG_LAYOUT_SCHEMA = os.getenv("LANGFUSE_SCORE_CONFIG_LAYOUT_SCHEMA", "")
    LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION = os.getenv("LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION", "")
    LANGFUSE_SCORE_CONFIG_RESOURCE_TEXT = os.getenv("LANGFUSE_SCORE_CONFIG_RESOURCE_TEXT", "")


def get_config() -> BaseConfig:
    return BaseConfig()


ROLE_MODEL_CONFIG_KEYS = {
    "actor": "LLM_MODEL_ACTOR",
    "planner": "LLM_MODEL_PLANNER",
    "tool_planner": "LLM_MODEL_TOOL_PLANNER",
    "reviewer": "LLM_MODEL_REVIEWER",
    "assistant": "LLM_MODEL_ASSISTANT",
}

# The role LLMClient has no branch for, reached by get_llm_client() with no role.
DEFAULT_ROLE = "default"


def default_role_model() -> str:
    """What the default role runs on: the model LLMClient picks with no role."""
    config = get_config()
    return config.AZURE_DEPLOYMENT_NAME if config.AZURE_API_KEY else config.LLM_MODEL


def resolved_role_models() -> dict[str, str]:
    """The model each role resolves to, as this process is configured."""
    config = get_config()
    models = {role: getattr(config, key) for role, key in ROLE_MODEL_CONFIG_KEYS.items()}
    models[DEFAULT_ROLE] = default_role_model()
    return models
