"""MCP client for interacting with the Altinn MCP server.
Version: 2025-10-29-debug-v2
"""

import asyncio
import json
import os
import time
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from shared.utils.logging_utils import get_logger

from agents.services.mcp.patch_generator import PatchGenerator
from fastmcp.client.transports import StreamableHttpTransport
from agents.services.patching import PatchValidator, normalize_patch_structure
from agents.services.repo import discover_repository_context
from shared.utils.langfuse_utils import score_validation

log = get_logger(__name__)

INITIAL_RETRY_DELAY_SECONDS = 2
MAX_RETRY_DELAY_SECONDS = 30
RETRY_BACKOFF_FACTOR = 2
DOCS_READY_TIMEOUT_SECONDS = 120
DOCS_READY_POLL_INTERVAL_SECONDS = 3
DOCS_MAX_CONSECUTIVE_FAILURES = 3
RECONNECT_MAX_RETRIES = 5


class MCPClient:
    """Client for interacting with MCP (Model Context Protocol) servers.
    
    Supports lazy connection — the agent service can start without MCP being
    available.  Call ``start_connection_loop()`` to begin a background task
    that retries until the server responds, then caches the tool list.
    """
    
    def __init__(self, server_url: str = "http://localhost:8070"):
        self.server_url = server_url
        self._client = None
        self._available_tools: list = []
        self._current_designer_api_key: str | None = None
        self._connected = False
        self._last_error: str | None = None
        self._connection_task: asyncio.Task | None = None
        self._docs_ready = False
        self._docs_indexing = False

    @property
    def is_ready(self) -> bool:
        """True when the MCP server has been reached at least once."""
        return self._connected

    @property
    def is_docs_ready(self) -> bool:
        """True when the MCP server's documentation index is fully built."""
        return self._docs_ready

    @property
    def is_docs_indexing(self) -> bool:
        """True while the MCP server is still indexing documentation."""
        return self._docs_indexing

    @property
    def last_error(self) -> str | None:
        return self._last_error

    def _mark_disconnected(self, error: Exception | str | None = None):
        """Reset connection state and restart a limited reconnection loop."""
        if error is not None:
            self._last_error = str(error)
        if not self._connected:
            return  # Already disconnected — avoid duplicate loops
        self._connected = False
        self._available_tools = []
        self._client = None
        self._docs_ready = False
        self._docs_indexing = False
        log.warning("🔌 MCP marked as disconnected — starting limited reconnection loop")
        self._start_reconnect_loop()

    async def _get_client(self, designer_api_key: str = None):
        """Get or create FastMCP client with Authorization header (MCP spec compliant)"""
        # Always recreate client if key changes (for security)
        if designer_api_key and designer_api_key != self._current_designer_api_key:
            self._client = None
            self._current_designer_api_key = designer_api_key

        if self._client is None:
            try:
                from fastmcp import Client
                # Server URL should already include /sse if needed
                log.info(f"Connecting to FastMCP server at: {self.server_url}")

                # Set X-Api-Key header for Gitea proxy authentication
                headers = {}
                if designer_api_key:
                    headers["X-Api-Key"] = designer_api_key
                    log.info("[AUTH] Using X-Api-Key authentication")

                # Create transport with headers
                self._client = Client(StreamableHttpTransport(url=self.server_url, headers=headers))
            except ImportError:
                log.error("FastMCP library not available, install with: pip install fastmcp")
                raise Exception("FastMCP library not installed")
        return self._client
    
    async def connect(self):
        """Connect to the MCP server and cache available tools."""
        # Skip if already connected and tools are cached
        if self._available_tools:
            log.debug(f"MCP client already connected with {len(self._available_tools)} tools cached")
            return
            
        # List available tools
        try:
            client = await self._get_client()
            async with client:
                await client.ping()
                tools = await client.list_tools()
                self._available_tools = [{"name": tool.name, "description": tool.description} for tool in tools]
                self._connected = True
                self._last_error = None
                log.info(f"Available MCP tools: {len(self._available_tools)}")
        except Exception as e:
            self._connected = False
            self._last_error = str(e)
            log.warning(f"Could not list MCP tools: {e}")
            raise

        # Check docs readiness on every successful connect (best-effort)
        await self._check_docs_status()

    async def _check_docs_status(self) -> bool:
        """Probe ``altinn_status`` to update docs readiness flags.

        Returns True if the check succeeded, False if MCP was unreachable
        or returned an error.
        """
        try:
            result = await self.call_tool("altinn_status", {})
            status = self._extract_status_dict(result)
            if status and "error" not in status:
                self._docs_ready = status.get("docs_ready", False)
                self._docs_indexing = status.get("docs_indexing", False)
                log.info(
                    f"📋 MCP docs status: ready={self._docs_ready}, indexing={self._docs_indexing}"
                )
                return True
            else:
                log.warning(f"📋 altinn_status returned error or unexpected data: {result!r}")
                return False
        except Exception as e:
            log.warning(f"Could not check MCP docs status: {e}")
            return False

    async def wait_for_docs_ready(self) -> bool:
        """Poll ``altinn_status`` until docs are ready or timeout.

        Returns True if docs became ready, False on timeout or if MCP
        becomes unreachable.  When MCP goes down, resets the connection
        state and restarts the background reconnection loop.
        """
        if self._docs_ready:
            return True

        consecutive_failures = 0
        start = time.time()
        while time.time() - start < DOCS_READY_TIMEOUT_SECONDS:
            success = await self._check_docs_status()
            if self._docs_ready:
                return True
            if success:
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                if consecutive_failures >= DOCS_MAX_CONSECUTIVE_FAILURES:
                    log.warning(
                        "MCP became unreachable while waiting for docs "
                        "— proceeding without documentation"
                    )
                    self._mark_disconnected(error="MCP unreachable during docs wait")
                    return False
            await asyncio.sleep(DOCS_READY_POLL_INTERVAL_SECONDS)

        log.warning(
            f"MCP docs did not become ready within {DOCS_READY_TIMEOUT_SECONDS}s — proceeding anyway"
        )
        return False

    @staticmethod
    def _extract_status_dict(result) -> dict | None:
        """Extract a dict from a call_tool result regardless of shape.

        Handles plain dicts, CallToolResult with structured_content,
        and CallToolResult with JSON text content.
        """
        if isinstance(result, dict):
            return result
        # CallToolResult with text content blocks
        if hasattr(result, "content"):
            import json as _json
            for block in (result.content if isinstance(result.content, list) else [result.content]):
                text = getattr(block, "text", None)
                if text:
                    try:
                        return _json.loads(text)
                    except (ValueError, TypeError):
                        continue
        return None

    async def _connection_loop(self, max_retries: int | None = None):
        """Background loop that retries connecting until successful.

        Args:
            max_retries: If set, give up after this many failed attempts.
                         None means retry indefinitely (used at startup).
        """
        delay = INITIAL_RETRY_DELAY_SECONDS
        attempts = 0
        while not self._connected:
            try:
                await self.connect()
                log.info("✅ MCP server connection established (background loop)")
                return
            except Exception:
                attempts += 1
                if max_retries is not None and attempts >= max_retries:
                    log.warning(
                        f"MCP reconnection failed after {attempts} attempts — giving up. "
                        f"Will retry when a new request triggers a connection check."
                    )
                    return
                log.info(
                    f"⏳ MCP server not available yet, retrying in {delay}s... "
                    f"({self.server_url})"
                )
                await asyncio.sleep(delay)
                delay = min(delay * RETRY_BACKOFF_FACTOR, MAX_RETRY_DELAY_SECONDS)

    def _start_reconnect_loop(self):
        """Start a limited reconnection loop after MCP goes down.

        Unlike ``start_connection_loop`` (used at startup), this gives up
        after ``RECONNECT_MAX_RETRIES`` attempts to avoid retrying forever.
        """
        if self._connection_task is not None and not self._connection_task.done():
            return  # A loop is already running
        self._connection_task = asyncio.create_task(
            self._connection_loop(max_retries=RECONNECT_MAX_RETRIES)
        )

    def start_connection_loop(self) -> asyncio.Task | None:
        """Start a non-blocking background task that connects when the server is ready.

        Safe to call multiple times — only one loop runs at a time.
        Retries indefinitely — intended for initial startup.
        Returns the ``asyncio.Task`` so the caller can cancel it on shutdown.
        """
        if self._connected:
            return None
        if self._connection_task is not None and not self._connection_task.done():
            return self._connection_task
        self._connection_task = asyncio.create_task(self._connection_loop())
        return self._connection_task

    async def ensure_connected(self):
        """Block until the MCP server is reachable.

        If a background loop is already running (e.g. the infinite startup
        loop), we do **not** await it — that would block forever while MCP
        is down.  Instead we attempt a single direct connection so the
        caller gets an immediate success or exception.
        """
        if self._connected:
            return
        await self.connect()
    
    async def check_server_status(self) -> dict:
        """
        Check MCP server status by verifying transport-level connectivity.
            
        Returns:
            dict with 'running' key
            
        Raises:
            Exception: If server is not running
        """
        try:
            client = await self._get_client()
            async with client:
                await client.ping()

            log.info("MCP server status: running")
            return {"running": True}

        except Exception as e:
            log.error(f"MCP server check failed: {e}")
            raise Exception(f"MCP server check failed: {e!s}") from e

    async def call_tool(self, tool_name: str, arguments: dict, designer_api_key: str = None):
        """Call an MCP tool and return the result."""
        try:
            # Get client with Authorization header set
            client = await self._get_client(designer_api_key)

            async with client:
                result = await client.call_tool(tool_name, arguments)
                
                # Handle CallToolResult objects with structured content
                if hasattr(result, 'structured_content') and result.structured_content:
                    return result.structured_content
                
                return result
        except Exception as e:
            log.error(f"Failed to call MCP tool {tool_name}: {e}")
            if self._is_connection_error(e):
                self._mark_disconnected(error=e)
            return {"error": str(e)}

    @staticmethod
    def _is_connection_error(exc: Exception) -> bool:
        """Check if an exception indicates MCP server is unreachable."""
        msg = str(exc).lower()
        return any(phrase in msg for phrase in [
            "failed to connect",
            "connection refused",
            "connection reset",
            "all connection attempts failed",
        ])
    
    async def create_patch_async(self, task_context: str, repository_path: str, attachments: Optional[list] = None, form_spec_summary: Optional[str] = None) -> dict:
        """
        Main workflow: Create a patch using MCP tools and LLM.

        Args:
            task_context: The user goal and high-level plan
            repository_path: Path to the repository
            attachments: Optional list of attachments (images, files) for vision analysis
            form_spec_summary: Optional structured form spec summary from spec agent
        
        Returns:
            Patch data with files and changes arrays
        """

        start_time = time.time()
        
        # This will be nested under the main workflow trace
        from shared.utils.langfuse_utils import trace_span
        patch_data = None  # Initialize to avoid UnboundLocalError
        try:
            # Step 1: Scan repository - FIRST to understand what files exist
            with trace_span("repository_scanning", metadata={"span_type": "TOOL"}) as scan_span:
                scan_span.update(metadata={
                    "repository_path": repository_path,
                    "tool": "repository_scanner"
                })

                repo_context = discover_repository_context(repository_path)
                # Convert PlanContext to dict format for compatibility
                repo_facts = {
                    'layouts': repo_context.layout_pages,
                    'models': repo_context.model_files,
                    'resources': repo_context.resource_files,
                    'app_type': 'altinn',
                    'available_locales': repo_context.available_locales,
                    'source_of_truth': repo_context.source_of_truth
                }

                # Get layout context for the first layout if available
                layout_context = None
                if repo_facts.get('layouts'):
                    first_layout = repo_facts['layouts'][0]
                    layout_path = Path(repository_path) / first_layout

                    try:
                        if layout_path.exists():
                            with open(layout_path, 'r') as f:
                                layout_context = json.load(f)
                                # Truncate to first few components for context
                                if 'data' in layout_context and 'layout' in layout_context['data']:
                                    layout_context['data']['layout'] = layout_context['data']['layout'][:3]
                    except Exception as e:
                        log.warning(f"Could not load layout context: {e}")

                scan_span.update(output={"repo_facts": repo_facts})

            # Step 2: Ensure MCP server connection (waits for background loop if needed)
            try:
                await self.ensure_connected()
            except Exception as conn_err:
                log.warning(f"⚠️ MCP connection unavailable — proceeding without MCP: {conn_err}")

            # Step 3: Extract planning guidance from task_context
            # Planning guidance should come from planning_tool_node
            planning_guidance = None
            if "PLANNING GUIDANCE:" not in task_context:
                if self._connected:
                    log.error("❌ CRITICAL: Planning guidance missing from task_context!")
                    log.error("The planning_tool_node must run successfully before create_patch_async is called.")
                    raise Exception(
                        "Planning guidance missing from task_context. "
                        "Ensure planning_tool_node executes successfully before planner_node. "
                        "This is a required step in the workflow."
                    )
                else:
                    log.warning(
                        "⚠️ Planning guidance missing (MCP disconnected) "
                        "— proceeding with LLM-only patch generation"
                    )
                    planning_guidance = ""
            else:
                # Extract the planning guidance from task_context
                log.info("✅ Planning guidance found in task_context (from planning_tool_node)")
                parts = task_context.split("PLANNING GUIDANCE:")
                if len(parts) > 1:
                    planning_guidance = parts[1].strip()

                if not planning_guidance:
                    log.warning("⚠️ Planning guidance section exists but is empty — proceeding anyway")
                    planning_guidance = ""

            log.info(f"ℹ️ Using planning guidance ({len(planning_guidance)} chars)")
            log.info(
                f"✅ Planning guidance section complete, planning_guidance={'SET (%d chars)' % len(planning_guidance) if planning_guidance else 'NOT SET'}"
            )

            # Derive a concise user_goal for the actor pipeline (exclude plan/guidance blocks)
            user_goal_for_pipeline = task_context
            if "\n\nHIGH-LEVEL PLAN:" in task_context:
                user_goal_for_pipeline = task_context.split("\n\nHIGH-LEVEL PLAN:")[0].strip()
            log.info(
                f"ℹ️ Derived user_goal_for_pipeline length: {len(user_goal_for_pipeline)} "
                f"(full task_context length: {len(task_context)})"
            )

            # Step 4: Use actor workflow pipeline to produce patch and intermediates
            try:
                log.info("🔧 Starting patch generation...")
                log.info(f"📊 About to create PatchGenerator with repository_path={repository_path}")
                generator = PatchGenerator(self, repository_path)
            except Exception as setup_error:
                log.error(f"❌ Failed to create PatchGenerator: {setup_error}", exc_info=True)
                raise
            repo_facts_with_context = {
                **repo_facts,
            }

            try:
                patch_data = await generator.generate_patch(
                    user_goal_for_pipeline,
                    repo_facts_with_context,
                    planner_step=planning_guidance,
                    attachments=attachments,
                    form_spec_summary=form_spec_summary,
                )

                if not patch_data:
                    log.error("❌ generator.generate_patch() returned None!")
                    raise Exception("Patch generator returned None - check actor pipeline logs for errors")

                log.info(f"✅ Patch generated with {len(patch_data.get('changes', []))} changes")

                if generator.last_output:
                    patch_data.setdefault("workflow", generator.last_output)
            except Exception as gen_error:
                log.error(f"❌ Patch generation failed: {gen_error}", exc_info=True)
                raise

            # Step 5: Normalize patch structure
            with trace_span("patch_normalization", metadata={"span_type": "TOOL"}) as norm_span:
                patch_data = normalize_patch_structure(patch_data)
                norm_span.update(output={
                    "files_count": len(patch_data.get('files', [])),
                    "changes_count": len(patch_data.get('changes', []))
                })

            log.info(f"Generated patch: {patch_data.get('summary', 'No summary')}")

            # Step 6: Validate patch
            validator = PatchValidator(self, repository_path)

            log.info(f"Starting validation for {len(patch_data.get('changes', []))} changes")
            
            with trace_span("patch_validation", metadata={"span_type": "TOOL"}) as validation_span:
                is_valid, errors, warnings = await validator.validate_patch(patch_data)

                validation_span.update(output={
                    "is_valid": is_valid,
                    "errors": errors,
                    "warnings": warnings
                })
                from shared.config.base_config import get_config as _get_config
                _cfg = _get_config()
                score_validation(
                    name="patch_validation",
                    passed=is_valid,
                    trace_id=validation_span.trace_id,
                    observation_id=validation_span.id,
                    config_id=_cfg.LANGFUSE_SCORE_CONFIG_PATCH_VALIDATION or None,
                    comment="; ".join(errors) if errors else "Passed",
                )

                if errors:
                    log.error(f"Validation errors remain after auto-fix: {errors}")

                if warnings:
                    log.info(f"Validation warnings: {warnings}")

            # Step 7: Return patch
            duration = time.time() - start_time
            if patch_data:
                log.info(f"Agentic MCP workflow completed in {duration:.1f}s: {patch_data.get('summary', 'No summary')}")
                return patch_data
            else:
                log.error("Patch generation failed: patch_data is None")
                raise Exception("Patch generation failed: no patch data was generated")

        except Exception as e:
            log.error(f"Agentic patch generation failed: {e}")
            raise Exception(f"Patch generation failed: {str(e)}")


# MCP client singleton
_mcp_client_instance: MCPClient | None = None

def get_mcp_client(server_url: str = None) -> MCPClient:
    """Get or create the singleton MCP client instance."""
    from shared.config import get_config

    global _mcp_client_instance

    if server_url is None:
        config = get_config()
        server_url = config.MCP_SERVER_URL

    if _mcp_client_instance is None:
        _mcp_client_instance = MCPClient(server_url)

    return _mcp_client_instance


def start_mcp_connection_loop() -> asyncio.Task | None:
    """Start the background MCP reconnection loop on the singleton client.

    Returns the ``asyncio.Task`` (or ``None`` if already connected) so the
    caller can cancel it during shutdown.
    """
    client = get_mcp_client()
    log.info(f"🔍 Starting background MCP connection loop ({client.server_url})")
    return client.start_connection_loop()
