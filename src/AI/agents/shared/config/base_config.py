"""Base configuration"""

import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class BaseConfig:
    """Base configuration class"""

    # Project paths
    PROJECT_ROOT = Path(__file__).parent.parent.parent
    LOG_DIR = PROJECT_ROOT / "logs"

    # Environment
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # API server settings
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8071"))

    # Gitea integration for agent branch pushes
    GITEA_BASE_URL = os.getenv("GITEA_BASE_URL", "http://host.docker.internal/repos")

    # CORS settings for frontend connections
    CORS_ORIGINS = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080",  # Alternative frontend port
        "http://studio.localhost",  # Studio frontend
    ]

    # External integrations
    MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://host.docker.internal:8070/sse")
    MCP_SERVER_EXPECTED_VERSION = os.getenv(
        "MCP_SERVER_EXPECTED_VERSION"
    )  # Optional: if set, checks for exact version match

    # LLM configuration - Digdir Gateway (OpenAI-compatible)
    GATEWAY_BASE_URL = os.getenv("GATEWAY_BASE_URL", "https://gw.sandkasse.ai/v1")
    GATEWAY_API_KEY = os.getenv("GATEWAY_API_KEY")

    DEFAULT_GATEWAY_MODEL = "telenor:gemma4"

    # Fallback to OpenAI if the gateway is not configured
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    LLM_MODEL = os.getenv("LLM_MODEL", DEFAULT_GATEWAY_MODEL)
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))

    # Per-role model configuration. All roles default to the gateway model, but
    # each can be pointed at a different gateway model via its own env var.
    # Planner: Complex reasoning, multi-step planning
    LLM_MODEL_PLANNER = os.getenv("LLM_MODEL_PLANNER", DEFAULT_GATEWAY_MODEL)
    LLM_TEMPERATURE_PLANNER = os.getenv("LLM_TEMPERATURE_PLANNER")  # Use model default

    # Tool Planner: Tool selection and query generation
    LLM_MODEL_TOOL_PLANNER = os.getenv("LLM_MODEL_TOOL_PLANNER", DEFAULT_GATEWAY_MODEL)
    LLM_TEMPERATURE_TOOL_PLANNER = os.getenv("LLM_TEMPERATURE_TOOL_PLANNER")
    LLM_TOOL_PLANNER_USE_COMPLETIONS = (
        os.getenv("LLM_TOOL_PLANNER_USE_COMPLETIONS", "false").lower() == "true"
    )
    LLM_TOOL_PLANNER_USE_RESPONSES = (
        os.getenv("LLM_TOOL_PLANNER_USE_RESPONSES", "false").lower() == "true"
    )

    # Actor: Precise code generation
    LLM_MODEL_ACTOR = os.getenv("LLM_MODEL_ACTOR", DEFAULT_GATEWAY_MODEL)
    LLM_TEMPERATURE_ACTOR = float(os.getenv("LLM_TEMPERATURE_ACTOR", "0.1"))

    # Reviewer: Code review and validation
    LLM_MODEL_REVIEWER = os.getenv("LLM_MODEL_REVIEWER", DEFAULT_GATEWAY_MODEL)
    LLM_TEMPERATURE_REVIEWER = float(os.getenv("LLM_TEMPERATURE_REVIEWER", "0.0"))

    # Verifier: Deterministic checks
    LLM_MODEL_VERIFIER = os.getenv("LLM_MODEL_VERIFIER", DEFAULT_GATEWAY_MODEL)
    LLM_TEMPERATURE_VERIFIER = float(os.getenv("LLM_TEMPERATURE_VERIFIER", "0.0"))

    # Assistant: Q&A chat
    LLM_MODEL_ASSISTANT = os.getenv("LLM_MODEL_ASSISTANT", DEFAULT_GATEWAY_MODEL)
    LLM_TEMPERATURE_ASSISTANT = os.getenv(
        "LLM_TEMPERATURE_ASSISTANT"
    )  # Some models don't support custom temperature

    # Attachment storage
    _DEFAULT_ATTACHMENTS_PATH = (
        Path(tempfile.gettempdir()) / "altinity_agent_attachments"
    )
    ATTACHMENTS_ROOT = Path(
        os.getenv("AGENT_ATTACHMENTS_PATH", str(_DEFAULT_ATTACHMENTS_PATH))
    )

    # Langfuse configuration
    LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
    LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
    LANGFUSE_HOST = os.getenv(
        "LANGFUSE_BASE_URL", "https://langfuse.digdir.cloud"
    )  # Use cloud by default, or self-hosted URL
    LANGFUSE_ENABLED = os.getenv("LANGFUSE_ENABLED", "true").lower() == "true"
    LANGFUSE_RELEASE = os.getenv(
        "LANGFUSE_RELEASE", "altinity-agents-v1.1"
    )  # Version/release tag for traces
    LANGFUSE_ENVIRONMENT = os.getenv(
        "LANGFUSE_ENVIRONMENT", ENVIRONMENT
    )  # Inherit from general environment

    # Created in Langfuse UI and paste the UUIDs here.
    # They enable structured, objective quality measurement across traces.
    LANGFUSE_SCORE_CONFIG_LAYOUT_SCHEMA = os.getenv(
        "LANGFUSE_SCORE_CONFIG_LAYOUT_SCHEMA", ""
    )
    LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION = os.getenv(
        "LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION", ""
    )
    LANGFUSE_SCORE_CONFIG_RESOURCE_TEXT = os.getenv(
        "LANGFUSE_SCORE_CONFIG_RESOURCE_TEXT", ""
    )
    LANGFUSE_SCORE_CONFIG_INTENT_MATCH = os.getenv(
        "LANGFUSE_SCORE_CONFIG_INTENT_MATCH", ""
    )
    LANGFUSE_SCORE_CONFIG_NO_HALLUCINATION = os.getenv(
        "LANGFUSE_SCORE_CONFIG_NO_HALLUCINATION", ""
    )
    LANGFUSE_SCORE_CONFIG_IMPLEMENTATION_MATCH = os.getenv(
        "LANGFUSE_SCORE_CONFIG_IMPLEMENTATION_MATCH", ""
    )


def get_config() -> BaseConfig:
    """Get configuration instance"""
    return BaseConfig()
