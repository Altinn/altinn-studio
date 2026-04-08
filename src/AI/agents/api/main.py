"""
Altinity Agent API Server
Provides API interface for Altinn Studio AI agents
"""
import asyncio
import logging
import sys
from contextlib import asynccontextmanager
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


class SuppressLangfuseTimeouts(logging.Filter):
    """Filter out noisy OTLP ReadTimeout logs to cloud.langfuse.com.

    These come from the OpenTelemetry HTTP exporter used by Langfuse and
    do not affect agent correctness. We treat them as best-effort noise
    and suppress them at the logging layer.
    """

    def filter(self, record: logging.LogRecord) -> bool:  # type: ignore[override]
        msg = record.getMessage()
        if ("cloud.langfuse.com" in msg or "langfuse.digdir.cloud" in msg) and "ReadTimeout" in msg:
            return False
        return True


# Attach filter to root logger handlers so child loggers (e.g.
# opentelemetry.exporter.otlp) cannot bypass it.
_langfuse_filter = SuppressLangfuseTimeouts()
for _handler in logging.root.handlers:
    _handler.addFilter(_langfuse_filter)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    # --- Startup ---
    from agents.services.events import sink
    from agents.services.mcp import start_mcp_connection_loop

    # Start background MCP connection (non-blocking — agent starts even if MCP is down)
    mcp_task = start_mcp_connection_loop()

    # Initialize Langfuse if enabled
    if config.LANGFUSE_ENABLED:
        try:
            from shared.utils.langfuse_utils import init_langfuse
            init_langfuse()
            logger.info(f"✅ Langfuse initialized - view traces at {config.LANGFUSE_HOST}")
        except Exception as e:
            logger.warning(f"⚠️  Failed to initialize Langfuse: {e}")

    loop = asyncio.get_running_loop()
    sink.set_main_loop(loop)
    logger.info("Event sink configured with main event loop")

    yield  # ---- application is running ----

    # --- Shutdown ---
    logger.info("Shutting down Altinity Agent API...")
    if mcp_task is not None and not mcp_task.done():
        mcp_task.cancel()
        try:
            await mcp_task
        except asyncio.CancelledError:
            pass


# Create FastAPI app
app = FastAPI(
    title="Altinity Agent API",
    description="API for Altinn Studio AI agents",
    version="2.0.0",
    lifespan=lifespan,
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


@app.get("/favicon.ico")
async def favicon():
    """Return empty favicon to prevent 404 errors"""
    return Response(content="", media_type="image/x-icon")


@app.get("/health")
async def health_check():
    """Health check endpoint including MCP connection and docs status."""
    from agents.services.mcp import get_mcp_client

    mcp = get_mcp_client()
    if mcp.is_ready:
        mcp_status = "connected"
    else:
        mcp_status = "connecting"

    if mcp.is_docs_ready:
        docs_status = "ready"
    elif mcp.is_docs_indexing:
        docs_status = "indexing"
    else:
        docs_status = "unknown"

    return {
        "status": "ok",
        "mcp": {
            "status": mcp_status,
            "server_url": mcp.server_url,
            "last_error": mcp.last_error,
            "docs_status": docs_status,
        },
    }


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Altinity Agent API on {config.API_HOST}:{config.API_PORT}")
    uvicorn.run(
        app,
        host=config.API_HOST,
        port=config.API_PORT,
        log_level=config.LOG_LEVEL.lower()
    )
