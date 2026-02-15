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
    GITEA_BASE_URL = os.getenv("GITEA_BASE_URL", "http://localhost:3000")

    # CORS settings for frontend connections
    CORS_ORIGINS = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080",  # Alternative frontend port
        "http://studio.localhost" # Studio frontend
    ]

    # External integrations
    MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8069/sse")
    MCP_SERVER_EXPECTED_VERSION = os.getenv("MCP_SERVER_EXPECTED_VERSION")  # Optional: if set, checks for exact version match

    # LLM configuration - Azure OpenAI preferred
    AZURE_API_KEY = os.getenv("AZURE_API_KEY")
    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://rndlabaidemoss0618689180.openai.azure.com/")
    AZURE_ANTHROPIC_ENDPOINT = os.getenv("AZURE_ANTHROPIC_ENDPOINT", "https://rndlabaidemoss0618689180.services.ai.azure.com/anthropic/")
    AZURE_API_VERSION = os.getenv("AZURE_API_VERSION", "2025-03-01-preview")
    AZURE_DEPLOYMENT_NAME = os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4o-mini-2M-tps")

    # Fallback to OpenAI if Azure not configured
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    
    # Multi-model configuration for different agent roles
    # Planner: Complex reasoning, multi-step planning
    LLM_MODEL_PLANNER = os.getenv("LLM_MODEL_PLANNER", "gpt-5")
    LLM_VERSION_PLANNER = os.getenv("LLM_VERSION_PLANNER", "2025-08-07")
    LLM_TEMPERATURE_PLANNER = os.getenv("LLM_TEMPERATURE_PLANNER")  # Use model default
    
    # Tool Planner: Tool selection and query generation
    LLM_MODEL_TOOL_PLANNER = os.getenv("LLM_MODEL_TOOL_PLANNER", "gpt-4o-2M-tps")
    LLM_VERSION_TOOL_PLANNER = os.getenv("LLM_VERSION_TOOL_PLANNER", "2025-09-15")
    LLM_TEMPERATURE_TOOL_PLANNER = os.getenv("LLM_TEMPERATURE_TOOL_PLANNER")
    LLM_TOOL_PLANNER_USE_COMPLETIONS = os.getenv("LLM_TOOL_PLANNER_USE_COMPLETIONS", "false").lower() == "true"
    LLM_TOOL_PLANNER_USE_RESPONSES = os.getenv("LLM_TOOL_PLANNER_USE_RESPONSES", "false").lower() == "true"
    
    # Actor: Precise code generation (Claude recommended)
    LLM_MODEL_ACTOR = os.getenv("LLM_MODEL_ACTOR", "claude-sonnet-4-5")
    LLM_VERSION_ACTOR = os.getenv("LLM_VERSION_ACTOR", "2025-04-14")
    LLM_TEMPERATURE_ACTOR = float(os.getenv("LLM_TEMPERATURE_ACTOR", "0.1"))
    
    # Reviewer: Code review and validation
    LLM_MODEL_REVIEWER = os.getenv("LLM_MODEL_REVIEWER", "gpt-4o-2M-tps")
    LLM_VERSION_REVIEWER = os.getenv("LLM_VERSION_REVIEWER", "2024-11-20")
    LLM_TEMPERATURE_REVIEWER = float(os.getenv("LLM_TEMPERATURE_REVIEWER", "0.0"))
    
    # Verifier: Deterministic checks
    LLM_MODEL_VERIFIER = os.getenv("LLM_MODEL_VERIFIER", "gpt-4o-mini-2M-tps")
    LLM_VERSION_VERIFIER = os.getenv("LLM_VERSION_VERIFIER", "2024-07-18")
    LLM_TEMPERATURE_VERIFIER = float(os.getenv("LLM_TEMPERATURE_VERIFIER", "0.0"))
    
    # Assistant: Q&A chat
    LLM_MODEL_ASSISTANT = os.getenv("LLM_MODEL_ASSISTANT", "o3")
    LLM_VERSION_ASSISTANT = os.getenv("LLM_VERSION_ASSISTANT")
    LLM_TEMPERATURE_ASSISTANT = os.getenv("LLM_TEMPERATURE_ASSISTANT")  # Some models don't support custom temperature

    # Attachment storage
    _DEFAULT_ATTACHMENTS_PATH = Path(tempfile.gettempdir()) / "altinity_agent_attachments"
    ATTACHMENTS_ROOT = Path(os.getenv("AGENT_ATTACHMENTS_PATH", str(_DEFAULT_ATTACHMENTS_PATH)))

    # Langfuse configuration
    LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
    LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
    LANGFUSE_HOST = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")  # Use cloud by default, or self-hosted URL
    LANGFUSE_ENABLED = os.getenv("LANGFUSE_ENABLED", "true").lower() == "true"
    LANGFUSE_RELEASE = os.getenv("LANGFUSE_RELEASE", "altinity-agents-v1")  # Version/release tag for traces
    LANGFUSE_ENVIRONMENT = os.getenv("LANGFUSE_ENVIRONMENT", ENVIRONMENT)  # Inherit from general environment


def get_config() -> BaseConfig:
    """Get configuration instance"""
    return BaseConfig()