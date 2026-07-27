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
        "http://studio.localhost" # Studio frontend
    ]


    # LLM configuration - Azure OpenAI preferred
    AZURE_API_KEY = os.getenv("AZURE_API_KEY")
    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://rndlabaidemoss0618689180.openai.azure.com/")
    AZURE_ANTHROPIC_ENDPOINT = os.getenv("AZURE_ANTHROPIC_ENDPOINT", "https://rndlabaidemoss0618689180.services.ai.azure.com/anthropic/")
    AZURE_API_VERSION = os.getenv("AZURE_API_VERSION", "2025-03-01-preview")
    AZURE_DEPLOYMENT_NAME = os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4o-mini-2M-tps")

    # Fallback to OpenAI if Azure not configured
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    # OpenAI-compatible base URL override. When set, OpenAIAdapter uses the
    # plain AsyncOpenAI client (not AsyncAzureOpenAI) against this URL with
    # AZURE_API_KEY/OPENAI_API_KEY as the bearer token. Use this for Azure
    # AI Foundry's OpenAI-compatible endpoint (e.g. Kimi-K2.6 deployment):
    # https://<resource>.services.ai.azure.com/openai/v1/
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
    LLM_MODEL = os.getenv("LLM_MODEL", "claude-haiku-4-5")
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))

    # Per-role model configuration.
    # The agentic loop reads LLM_MODEL_ACTOR via core.llm_adapter.build_adapter.
    # Everything else goes through services.llm.LLMClient by role:
    #   - planner       → intake + spec workflows + semantic query
    #   - tool_planner  → assistant chat-mode tool planning
    #   - reviewer      → post-workflow LLM-as-judge evaluators
    #                     (intent / implementation / hallucination)
    #   - assistant     → assistant chat-mode Q&A
    # Temperatures are env-overridable. Models default to Claude on Azure
    # Anthropic; flip to any Azure OpenAI / Foundry deployment by name.

    # Planner: intake + spec pipelines (still classic LLMClient calls).
    LLM_MODEL_PLANNER = os.getenv("LLM_MODEL_PLANNER", "claude-opus-4-8")
    LLM_TEMPERATURE_PLANNER = os.getenv("LLM_TEMPERATURE_PLANNER")  # None → model default

    # Tool Planner: assistant chat-mode tool selection.
    LLM_MODEL_TOOL_PLANNER = os.getenv("LLM_MODEL_TOOL_PLANNER", "claude-sonnet-5")
    LLM_TEMPERATURE_TOOL_PLANNER = os.getenv("LLM_TEMPERATURE_TOOL_PLANNER")
    # Toggle to use OpenAI Chat Completions / Responses API instead of the
    # default chat surface — only applies when the tool-planner model is an
    # OpenAI / Azure OpenAI deployment that supports those APIs.
    LLM_TOOL_PLANNER_USE_COMPLETIONS = os.getenv("LLM_TOOL_PLANNER_USE_COMPLETIONS", "false").lower() == "true"
    LLM_TOOL_PLANNER_USE_RESPONSES = os.getenv("LLM_TOOL_PLANNER_USE_RESPONSES", "false").lower() == "true"

    # Actor: drives the agentic loop (the model running tool_use turns).
    LLM_MODEL_ACTOR = os.getenv("LLM_MODEL_ACTOR", "claude-sonnet-5")

    # Reviewer: post-workflow LLM-as-judge evaluators.
    LLM_MODEL_REVIEWER = os.getenv("LLM_MODEL_REVIEWER", "claude-sonnet-5")
    LLM_TEMPERATURE_REVIEWER = float(os.getenv("LLM_TEMPERATURE_REVIEWER", "0.0"))

    # Assistant: chat-mode Q&A reply.
    LLM_MODEL_ASSISTANT = os.getenv("LLM_MODEL_ASSISTANT", "claude-sonnet-5")
    LLM_TEMPERATURE_ASSISTANT = os.getenv("LLM_TEMPERATURE_ASSISTANT")  # None → model default

    # Attachment storage
    _DEFAULT_ATTACHMENTS_PATH = Path(tempfile.gettempdir()) / "altinity_agent_attachments"
    ATTACHMENTS_ROOT = Path(os.getenv("AGENT_ATTACHMENTS_PATH", str(_DEFAULT_ATTACHMENTS_PATH)))

    # Langfuse configuration
    LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
    LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
    LANGFUSE_HOST = os.getenv("LANGFUSE_BASE_URL", "https://langfuse.digdir.cloud")  # Use cloud by default, or self-hosted URL
    LANGFUSE_ENABLED = os.getenv("LANGFUSE_ENABLED", "true").lower() == "true"
    LANGFUSE_RELEASE = os.getenv("LANGFUSE_RELEASE", "altinity-agents-v1.1")  # Version/release tag for traces
    LANGFUSE_ENVIRONMENT = os.getenv("LANGFUSE_ENVIRONMENT", ENVIRONMENT)  # Inherit from general environment

    # Created in Langfuse UI and paste the UUIDs here.
    # They enable structured, objective quality measurement across traces.
    LANGFUSE_SCORE_CONFIG_LAYOUT_SCHEMA = os.getenv("LANGFUSE_SCORE_CONFIG_LAYOUT_SCHEMA", "")
    LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION = os.getenv("LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION", "")
    LANGFUSE_SCORE_CONFIG_RESOURCE_TEXT = os.getenv("LANGFUSE_SCORE_CONFIG_RESOURCE_TEXT", "")
    LANGFUSE_SCORE_CONFIG_INTENT_MATCH = os.getenv("LANGFUSE_SCORE_CONFIG_INTENT_MATCH", "")
    LANGFUSE_SCORE_CONFIG_NO_HALLUCINATION = os.getenv("LANGFUSE_SCORE_CONFIG_NO_HALLUCINATION", "")
    LANGFUSE_SCORE_CONFIG_IMPLEMENTATION_MATCH = os.getenv("LANGFUSE_SCORE_CONFIG_IMPLEMENTATION_MATCH", "")


def get_config() -> BaseConfig:
    """Get configuration instance"""
    return BaseConfig()
