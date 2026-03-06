"""MCP client for interacting with the Altinn MCP server.
Version: 2025-10-29-debug-v2
"""

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

log = get_logger(__name__)


class MCPClient:
    """Client for interacting with MCP (Model Context Protocol) servers."""
    
    def __init__(self, server_url: str = "http://localhost:8070"): # TODO: Make this configurable
        self.server_url = server_url
        self._client = None
        self._available_tools = []
    
    async def _get_client(self):
        """Get or create FastMCP client"""
        if self._client is None:
            try:
                from fastmcp import Client
                # Server URL should already include /sse if needed
                log.info(f"Connecting to FastMCP server at: {self.server_url}")
                self._client = Client(StreamableHttpTransport(url=self.server_url))
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
                log.info(f"Available MCP tools: {len(self._available_tools)}")
        except Exception as e:
            log.warning(f"Could not list MCP tools: {e}")
    
    async def check_server_status(self) -> dict:
        """
        Check MCP server status by verifying connectivity.
            
        Returns:
            dict with 'running' key
            
        Raises:
            Exception: If server is not running
        """
        try:
            result = await self.call_tool("altinn_help", {"topic": "overview"})
            
            if isinstance(result, dict) and "error" in result:
                raise Exception(f"MCP server not responding: {result['error']}")
            
            # If we got a response, server is running
            log.info("MCP server status: running")
            
            return {
                "running": True,
            }
            
        except Exception as e:
            log.error(f"MCP server check failed: {e}")
            raise Exception(f"MCP server check failed: {str(e)}")
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """Call an MCP tool and return the result."""
        try:
            client = await self._get_client()
            async with client:
                result = await client.call_tool(tool_name, arguments)
                
                # Handle CallToolResult objects with structured content
                if hasattr(result, 'structured_content') and result.structured_content:
                    return result.structured_content
                
                return result
        except Exception as e:
            log.error(f"Failed to call MCP tool {tool_name}: {e}")
            return {"error": str(e)}
    
    async def create_patch_async(self, task_context: str, repository_path: str, attachments: list = None, form_spec_summary: str = None) -> dict:
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
            
            # Step 2: Connect to MCP server
            await self.connect()
            
            # Step 3: Extract planning guidance from task_context
            # Planning guidance MUST be present - it should come from planning_tool_node
            planning_guidance = None
            if "PLANNING GUIDANCE:" not in task_context:
                log.error("❌ CRITICAL: Planning guidance missing from task_context!")
                log.error("The planning_tool_node must run successfully before create_patch_async is called.")
                log.error("Planning guidance is a REQUIRED part of the workflow.")
                raise Exception(
                    "Planning guidance missing from task_context. "
                    "Ensure planning_tool_node executes successfully before planner_node. "
                    "This is a required step in the workflow."
                )

            # Extract the planning guidance from task_context
            log.info("✅ Planning guidance found in task_context (from planning_tool_node)")
            parts = task_context.split("PLANNING GUIDANCE:")
            if len(parts) > 1:
                planning_guidance = parts[1].strip()

            if not planning_guidance:
                log.error("❌ Planning guidance section exists but is empty!")
                raise Exception("Planning guidance section is empty - planning_tool_node may have failed")

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


async def check_mcp_server_startup(server_url: str = None, expected_version: str = None):
    """
    Check MCP server status and version at startup.
    
    Args:
        server_url: MCP server URL. If None, uses config default.
        expected_version: Expected version string. If None, uses config default.
        
    Exits the application with code 1 if MCP server check fails.
    """
    import os
    from shared.config import get_config
    
    config = get_config()
    if server_url is None:
        server_url = config.MCP_SERVER_URL
    if expected_version is None:
        expected_version = config.MCP_SERVER_EXPECTED_VERSION
    
    print(f"🔍 Checking MCP server at startup: {server_url}")
    
    try:
        # Create client and check status
        client = MCPClient(server_url)
        status = await client.check_server_status()
        
        if status["running"]:
            print(f"✅ MCP server check passed")
            return status
            
    except Exception as e:
        error_msg = f"Cannot connect to MCP server: {str(e)}"
        print(f"❌ {error_msg}")
        print("\n🚫 Altinity startup failed: MCP server not running")
        print("💡 Start the MCP server first before starting Altinity")
        os._exit(1)