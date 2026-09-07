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
    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://rndlabaidemoss0618689180.openai.azure.com/")
    AZURE_ANTHROPIC_ENDPOINT = os.getenv("AZURE_ANTHROPIC_ENDPOINT", "https://rndlabaidemoss0618689180.services.ai.azure.com/anthropic/")
    AZURE_API_VERSION = os.getenv("AZURE_API_VERSION", "2025-03-01-preview")
    AZURE_DEPLOYMENT_NAME = os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-5.4-mini")

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
    LLM_MODEL = os.getenv("LLM_MODEL", "claude-haiku-4-5")
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))


    LLM_MODEL_PLANNER = os.getenv("LLM_MODEL_PLANNER", "claude-opus-4-8")
    LLM_TEMPERATURE_PLANNER = os.getenv("LLM_TEMPERATURE_PLANNER")  # None → model default

    LLM_MODEL_TOOL_PLANNER = os.getenv("LLM_MODEL_TOOL_PLANNER", "claude-sonnet-5")
    LLM_TEMPERATURE_TOOL_PLANNER = os.getenv("LLM_TEMPERATURE_TOOL_PLANNER")
    LLM_TOOL_PLANNER_USE_COMPLETIONS = os.getenv("LLM_TOOL_PLANNER_USE_COMPLETIONS", "false").lower() == "true"
    LLM_TOOL_PLANNER_USE_RESPONSES = os.getenv("LLM_TOOL_PLANNER_USE_RESPONSES", "false").lower() == "true"

    LLM_MODEL_ACTOR = os.getenv("LLM_MODEL_ACTOR", "claude-sonnet-5")

    LLM_MODEL_REVIEWER = os.getenv("LLM_MODEL_REVIEWER", "claude-sonnet-5")
    LLM_TEMPERATURE_REVIEWER = float(os.getenv("LLM_TEMPERATURE_REVIEWER", "0.0"))

    LLM_MODEL_ASSISTANT = os.getenv("LLM_MODEL_ASSISTANT", "claude-sonnet-5")
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
    LANGFUSE_RELEASE = os.getenv("LANGFUSE_RELEASE", "altinity-agents-v1.1")
    LANGFUSE_ENVIRONMENT = os.getenv("LANGFUSE_ENVIRONMENT", ENVIRONMENT)
    LANGFUSE_TRACE_RETENTION_DAYS = int(os.getenv("LANGFUSE_TRACE_RETENTION_DAYS", "90"))

    LANGFUSE_SCORE_CONFIG_LAYOUT_SCHEMA = os.getenv("LANGFUSE_SCORE_CONFIG_LAYOUT_SCHEMA", "")
    LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION = os.getenv("LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION", "")
    LANGFUSE_SCORE_CONFIG_RESOURCE_TEXT = os.getenv("LANGFUSE_SCORE_CONFIG_RESOURCE_TEXT", "")


def get_config() -> BaseConfig:
    return BaseConfig()
