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
    ]

    # External integrations
    MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8069")


def get_config() -> BaseConfig:
    """Get configuration instance"""
    return BaseConfig()