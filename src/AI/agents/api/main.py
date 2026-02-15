"""
Altinity Agent API Server
Provides API interface for Altinn Studio AI agents
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
from api.routes import register_websocket_routes, agent_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format=config.LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Altinity Agent API",
    description="API for Altinn Studio AI agents",
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

# Register routes
register_websocket_routes(app)
app.include_router(agent_router)

# Startup event to set the main event loop for event sink
@app.on_event("startup")
async def startup_event():
    """Set up the main event loop for async event handling"""
    import asyncio
    from agents.services.events import sink
    from agents.services.mcp import check_mcp_server_startup
    from shared.config import get_config

    # Check MCP server status first
    await check_mcp_server_startup()

    # Initialize Langfuse if enabled
    config = get_config()
    if config.LANGFUSE_ENABLED:
        try:
            from shared.utils.langfuse_utils import init_langfuse
            init_langfuse()
            print(f"✅ Langfuse initialized - view traces at {config.LANGFUSE_HOST}")
        except Exception as e:
            print(f"⚠️  Failed to initialize Langfuse: {e}")
    loop = asyncio.get_running_loop()
    sink.set_main_loop(loop)
    logger.info("Event sink configured with main event loop")

# Shutdown event to clean up background processes
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up background processes on shutdown"""
    logger.info("Shutting down Altinity Agent API...")

@app.get("/favicon.ico")
async def favicon():
    """Return empty favicon to prevent 404 errors"""
    return Response(content="", media_type="image/x-icon")

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Altinity Agent API on {config.API_HOST}:{config.API_PORT}")
    uvicorn.run(
        app,
        host=config.API_HOST,
        port=config.API_PORT,
        log_level=config.LOG_LEVEL.lower()
    )
