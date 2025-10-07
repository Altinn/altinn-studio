"""
Altinity Frontend API Server
Provides API interface for app preview and management
"""
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from shared.config import get_config

# Get configuration
config = get_config()
from shared.models import StatusResponse
from shared.utils.mlflow_utils import init_mlflow
from frontend_api.apps import AppManager
from frontend_api.routes import register_app_routes, register_file_routes, register_git_routes, register_preview_routes, register_websocket_routes, agent_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format=config.LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Initialize MLflow tracking
init_mlflow()

# State persistence
APP_STATE_FILE = Path(__file__).parent / "app_state.json"

# Initialize app manager
app_manager = AppManager(config.ALTINN_STUDIO_APPS_PATH, APP_STATE_FILE)

# Create FastAPI app
app = FastAPI(
    title="Altinity Middleware",
    description="API for Altinn app preview and management",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
register_app_routes(app, app_manager, config.ALTINN_STUDIO_APPS_PATH)
register_file_routes(app, app_manager)
register_git_routes(app, app_manager)
register_preview_routes(app, config.ALTINN_STUDIO_APPS_PATH, app_manager.resolve_app_directory)
register_websocket_routes(app)

# Register agent routes
app.include_router(agent_router)

# Startup event to set the main event loop for event sink
@app.on_event("startup")
async def startup_event():
    """Set up the main event loop for async event handling"""
    import asyncio
    from agents.services.events import sink
    loop = asyncio.get_running_loop()
    sink.set_main_loop(loop)
    logger.info("Event sink configured with main event loop")

# Basic endpoints
@app.get("/favicon.ico")
async def favicon():
    """Return empty favicon to prevent 404 errors"""
    return Response(content="", media_type="image/x-icon")

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok"}

@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """Get system status"""
    current_app = app_manager.get_current_app()
    return StatusResponse(
        status="online",
        services={"app_manager": "running"},
        active_sessions=0,
        current_app=current_app
    )

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Altinity Frontend API on {config.FRONTEND_API_HOST}:{config.FRONTEND_API_PORT}")
    uvicorn.run(
        app,
        host=config.FRONTEND_API_HOST,
        port=config.FRONTEND_API_PORT,
        log_level=config.LOG_LEVEL.lower()
    )
