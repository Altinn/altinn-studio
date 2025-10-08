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
    title="Altinity",
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
register_websocket_routes(app)

# Register agent routes
app.include_router(agent_router)

# Global variable to track MLflow process
_mlflow_process = None

# Startup event to set the main event loop for event sink
@app.on_event("startup")
async def startup_event():
    """Set up the main event loop for async event handling"""
    global _mlflow_process
    import asyncio
    import subprocess
    import os
    from agents.services.events import sink
    from agents.services.mcp import check_mcp_server_startup
    from shared.config import get_config
    
    # Check MCP server status first
    await check_mcp_server_startup()
    
    # Start MLflow UI if enabled
    config = get_config()
    if config.MLFLOW_ENABLED:
        try:
            import socket
            # Check if port is already in use
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                port_in_use = s.connect_ex(('localhost', config.MLFLOW_UI_PORT)) == 0
            
            if port_in_use:
                print(f"ℹ️  MLflow UI already running on port {config.MLFLOW_UI_PORT}")
            else:
                # Start MLflow UI in background
                mlflow_cmd = ["mlflow", "ui", "--backend-store-uri", config.MLFLOW_TRACKING_URI, "--port", str(config.MLFLOW_UI_PORT)]
                print(f"🚀 Starting MLflow UI: {' '.join(mlflow_cmd)}")
                _mlflow_process = subprocess.Popen(
                    mlflow_cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True
                )
                print(f"✅ MLflow UI started - accessible at http://localhost:{config.MLFLOW_UI_PORT}")
        except Exception as e:
            print(f"⚠️  Failed to start MLflow UI: {e}")
    
    loop = asyncio.get_running_loop()
    sink.set_main_loop(loop)
    logger.info("Event sink configured with main event loop")

# Shutdown event to clean up background processes
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up background processes on shutdown"""
    global _mlflow_process
    import os
    
    if _mlflow_process is not None:
        try:
            print("🛑 Stopping MLflow UI...")
            # Get the process group ID (set by start_new_session=True)
            pgid = os.getpgid(_mlflow_process.pid)
            # Kill the entire process group
            os.killpg(pgid, 15)  # SIGTERM to process group
            
            # Wait up to 5 seconds for graceful shutdown
            try:
                _mlflow_process.wait(timeout=5)
                print("✅ MLflow UI stopped gracefully")
            except subprocess.TimeoutExpired:
                # Force kill the process group if it doesn't respond
                os.killpg(pgid, 9)  # SIGKILL to process group
                _mlflow_process.wait()  # Wait for confirmation
                print("⚠️  MLflow UI force-killed after timeout")
        except Exception as e:
            print(f"⚠️  Error stopping MLflow UI: {e}")
            # Last resort: try to kill the direct process
            try:
                _mlflow_process.kill()
                _mlflow_process.wait(timeout=2)
                print("✅ MLflow UI killed as fallback")
            except:
                print("❌ Failed to stop MLflow UI completely")

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
