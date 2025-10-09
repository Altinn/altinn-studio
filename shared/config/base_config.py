"""Base configuration"""
import os
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

    # Frontend API settings
    FRONTEND_API_HOST = os.getenv("FRONTEND_API_HOST", "0.0.0.0")
    FRONTEND_API_PORT = int(os.getenv("FRONTEND_API_PORT", "8071"))

    # Altinn Studio integration
    ALTINN_STUDIO_APPS_PATH = os.getenv("ALTINN_STUDIO_APPS_PATH", str(Path.home() / "Apps"))
    GITEA_API_TOKEN = os.getenv("GITEA_API_TOKEN")
    GITEA_URL = os.getenv("GITEA_URL", "https://altinn.studio/repos/api/v1")

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
    AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT", "https://rndlabaidemoss0618689180.openai.azure.com/")
    AZURE_API_VERSION = os.getenv("AZURE_API_VERSION", "2024-12-01-preview")
    AZURE_DEPLOYMENT_NAME = os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4o-mini-2M-tps")

    # Fallback to OpenAI if Azure not configured
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    
    # Multi-model configuration for different agent roles
    # Use powerful models for complex reasoning, cheap models for simple tasks
    LLM_MODEL_PLANNER = os.getenv("LLM_MODEL_PLANNER", os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4o-mini-2M-tps"))
    LLM_MODEL_ACTOR = os.getenv("LLM_MODEL_ACTOR", os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4o-mini-2M-tps"))
    LLM_MODEL_REVIEWER = os.getenv("LLM_MODEL_REVIEWER", "gpt-4o-mini-2M-tps")
    LLM_MODEL_VERIFIER = os.getenv("LLM_MODEL_VERIFIER", "gpt-4o-mini-2M-tps")
    
    # Model versions per role (optional, for Azure deployments with specific versions)
    LLM_VERSION_PLANNER = os.getenv("LLM_VERSION_PLANNER")
    LLM_VERSION_ACTOR = os.getenv("LLM_VERSION_ACTOR")
    LLM_VERSION_REVIEWER = os.getenv("LLM_VERSION_REVIEWER")
    LLM_VERSION_VERIFIER = os.getenv("LLM_VERSION_VERIFIER")
    
    # Temperature settings per role
    LLM_TEMPERATURE_PLANNER = float(os.getenv("LLM_TEMPERATURE_PLANNER", "0.3"))  # Higher for creativity
    LLM_TEMPERATURE_ACTOR = float(os.getenv("LLM_TEMPERATURE_ACTOR", "0.1"))  # Lower for precision
    LLM_TEMPERATURE_REVIEWER = float(os.getenv("LLM_TEMPERATURE_REVIEWER", "0.2"))
    LLM_TEMPERATURE_VERIFIER = float(os.getenv("LLM_TEMPERATURE_VERIFIER", "0.0"))  # Deterministic

    # MLflow configuration
    MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", str(PROJECT_ROOT / "mlruns"))
    MLFLOW_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "Altinity_Agentic_Workflow")
    MLFLOW_ENABLED = os.getenv("MLFLOW_ENABLED", "true").lower() == "true"
    MLFLOW_UI_PORT = int(os.getenv("MLFLOW_UI_PORT", "5000"))


def get_config() -> BaseConfig:
    """Get configuration instance"""
    return BaseConfig()