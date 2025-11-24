"""
MCP Client - Streamlined Core Module
Handles MCP server connection and orchestrates patch generation workflow.
"""

import json
import mlflow
import os
import time
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from agents.services.telemetry import (
    SpanTypes, capture_tool_output, create_tool_span, format_as_markdown, is_json
)
from shared.utils.logging_utils import get_logger

from agents.services.mcp.patch_generator import PatchGenerator
from agents.services.patching import PatchValidator, normalize_patch_structure
from agents.services.repo import discover_repository_context

log = get_logger(__name__)


class MCPClient:
    """Client for interacting with MCP (Model Context Protocol) servers."""
    
    def __init__(self, server_url: str = "http://localhost:8069"): # TODO: Make this configurable
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
                self._client = Client(self.server_url)
            except ImportError:
                log.error("FastMCP library not available, install with: pip install fastmcp")
                raise Exception("FastMCP library not installed")
        return self._client
    
    async def connect(self):
        """Connect to the MCP server."""
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
    
    async def check_server_status(self, expected_version: str = None) -> dict:
        """
        Check MCP server status and version.
        
        Args:
            expected_version: Expected version string (e.g., "1.0.0"). If None, just checks connectivity.
            
        Returns:
            dict with 'running', 'version', 'version_match' keys
            
        Raises:
            Exception: If server is not running or version doesn't match
        """
        try:
            # Try to call server_info tool
            result = await self.call_tool("server_info", {})
            
            if isinstance(result, dict) and "error" in result:
                raise Exception(f"MCP server not responding: {result['error']}")
            
            # Extract server info from result
            if hasattr(result, 'content'):
                # CallToolResult object (newer MCP versions)
                content = result.content
                if isinstance(content, str):
                    # JSON string - parse it
                    try:
                        server_info = json.loads(content)
                    except json.JSONDecodeError:
                        raise Exception(f"Invalid JSON in CallToolResult content: {content}")
                elif isinstance(content, list) and len(content) > 0:
                    # List of response objects
                    first_item = content[0]
                    if hasattr(first_item, 'text'):
                        # Parse JSON from text attribute
                        try:
                            server_info = json.loads(first_item.text)
                        except json.JSONDecodeError:
                            raise Exception(f"Invalid JSON in CallToolResult list item: {first_item.text}")
                    else:
                        # Plain object
                        server_info = first_item
                else:
                    # Content is already a dict or other object
                    server_info = content
            elif isinstance(result, list) and len(result) > 0:
                # Legacy list format (older MCP versions)
                if hasattr(result[0], 'text'):
                    # Parse JSON response
                    try:
                        server_info = json.loads(result[0].text)
                    except json.JSONDecodeError:
                        raise Exception("Invalid server_info response format")
                else:
                    server_info = result[0]
            else:
                # Direct dict response (fallback)
                server_info = result
                        
            # Extract version (required for this MCP server)
            if isinstance(server_info, dict):
                # Check if version is directly available
                version = server_info.get("version")
                if not version:
                    # Check if it's nested under 'result' key
                    result_data = server_info.get("result")
                    if isinstance(result_data, dict):
                        version = result_data.get("version")
                        # Update server_info to point to the result data for consistency
                        server_info = result_data
                        
                if not version:
                    # Try other possible keys
                    version = server_info.get("server_version") or server_info.get("mcp_version")
                    if not version:
                        log.error(f"server_info dict keys: {list(server_info.keys())}")
                        if "result" in server_info and isinstance(server_info["result"], dict):
                            log.error(f"result dict keys: {list(server_info['result'].keys())}")
                        raise Exception(f"Server did not return version information. Available keys: {list(server_info.keys())}")
            else:
                log.error(f"server_info is not a dict, it's: {type(server_info)} - {server_info}")
                raise Exception(f"Server returned unexpected format: {type(server_info)}")
            
            # Check version format (should be x.x.x)
            import re
            if not re.match(r'^\d+\.\d+\.\d+$', version):
                raise Exception(f"Invalid version format: {version} (expected x.x.x)")
            
            # Check version match if expected version provided
            version_match = True
            if expected_version:
                version_match = version == expected_version
            
            log.info(f"MCP server status: running, version: {version}")
            
            return {
                "running": True,
                "version": version,
                "version_match": version_match
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
    
    async def create_patch_async(self, task_context: str, repository_path: str) -> dict:
        """
        Main workflow: Create a patch using MCP tools and LLM.
        
        Returns:
            Patch data with files and changes arrays
        """
        
        start_time = time.time()
        
        # Set up MLflow experiment
        from shared.utils.mlflow_utils import get_or_create_experiment
        experiment_name = get_or_create_experiment()
        if experiment_name:
            mlflow.set_experiment(experiment_name)
        
        # This will be nested under the main workflow trace
        try:
            # Step 1: Scan repository - FIRST to understand what files exist
            with mlflow.start_span(name="repository_scanning", span_type="TOOL") as scan_span:
                scan_span.set_attributes({
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
                
                # Format the output for multiple views
                scan_span.set_outputs({
                    "raw_result": repo_facts,
                    "formats": {
                        "text": str(repo_facts),
                        "markdown": format_as_markdown(repo_facts),
                        "json": repo_facts
                    },
                    "summary": {
                        "file_count": len(repo_facts.get("layouts", [])) + len(repo_facts.get("models", [])) + len(repo_facts.get("resources", [])),
                        "directory_count": sum(1 for dir_path in [
                            Path(repository_path) / "App" / "ui" / "form" / "layouts",
                            Path(repository_path) / "App" / "models",
                            Path(repository_path) / "App" / "config" / "texts"
                        ] if dir_path.exists()),  # Actually count existing Altinn directories
                        "layout_count": len(repo_facts.get("layouts", []))
                    }
                })
            
            # Step 2: Connect to MCP server
            await self.connect()
            
            # Step 3: Get high-level planning guidance - BEFORE detailed planning
            planning_guidance = None
            with mlflow.start_span(name="planning_guidance_generation", span_type="TOOL") as planning_span:
                try:
                    # Create planning tool input
                    tool_input = {
                        "user_goal": task_context,
                        "repository_facts": repo_facts
                    }
                    
                    # Set detailed attributes
                    planning_span.set_attributes({
                        "goal_length": len(task_context),
                        "tool": "planning_tool"
                    })
                    planning_span.set_inputs({
                        "user_goal": task_context,
                        "repository_facts_summary": {
                            "file_count": len(repo_facts.get("layouts", [])) + len(repo_facts.get("models", [])) + len(repo_facts.get("resources", [])),
                            "directory_count": sum(1 for dir_path in [
                                Path(repository_path) / "App" / "ui" / "form" / "layouts",
                                Path(repository_path) / "App" / "models",
                                Path(repository_path) / "App" / "config" / "texts"
                            ] if dir_path.exists()),
                            "layout_count": len(repo_facts.get("layouts", []))
                        }
                    })
                    
                    # Call planning tool for high-level guidance only
                    planning_result = await self.call_tool('planning_tool', tool_input)
                    
                    # Extract text from MCP response
                    if planning_result and isinstance(planning_result, list) and len(planning_result) > 0:
                        if hasattr(planning_result[0], 'text'):
                            planning_guidance = planning_result[0].text
                    
                    # Format the output for multiple views
                    planning_span.set_outputs({
                        "full_guidance": planning_guidance,  # Complete guidance text
                        "guidance_summary": planning_guidance[:200] + "..." if planning_guidance and len(planning_guidance) > 200 else planning_guidance,
                        "guidance_length": len(str(planning_guidance)) if planning_guidance else 0,
                        "formats": {
                            "text": planning_guidance,
                            "markdown": f"```\n{planning_guidance}\n```" if planning_guidance else None,
                            "json": json.loads(planning_guidance) if planning_guidance and is_json(planning_guidance) else None
                        }
                    })
                    log.info("Retrieved planning guidance from MCP planning_tool")
                except Exception as e:
                    planning_span.set_attribute("error", str(e))
                    log.warning(f"Could not get planning guidance: {e}")
                
                # Step 4: Use actor workflow pipeline to produce patch and intermediates
                generator = PatchGenerator(self, repository_path)
                repo_facts_with_context = {
                    **repo_facts,
                }

                patch_data = await generator.generate_patch(
                    task_context,
                    repo_facts_with_context,
                    planner_step=planning_guidance
                )

                if generator.last_output:
                    patch_data.setdefault("workflow", generator.last_output)
                
                # Step 5: Normalize patch structure
                with mlflow.start_span(name="patch_normalization") as norm_span:
                    patch_data = normalize_patch_structure(patch_data)
                    norm_span.set_outputs({
                        "files_count": len(patch_data.get('files', [])),
                        "changes_count": len(patch_data.get('changes', []))
                    })
                
                log.info(f"Generated patch: {patch_data.get('summary', 'No summary')}")
                
                # Step 6: Validate patch
                validator = PatchValidator(self, repository_path)
                
                log.info(f"Starting validation for {len(patch_data.get('changes', []))} changes")
                
                with mlflow.start_span(name="patch_validation") as validation_span:
                    is_valid, errors, warnings = await validator.validate_patch(patch_data)
                    
                    validation_span.set_outputs({
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
            log.info(f"Agentic MCP workflow completed in {duration:.1f}s: {patch_data.get('summary', 'No summary')}")
            
            return patch_data
            
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
        status = await client.check_server_status(expected_version)
        
        if status["running"] and status["version_match"]:
            print(f"✅ MCP server check passed - Version: {status['version']}")
            return status
        else:
            error_msg = f"MCP server version mismatch. Expected: {expected_version}, Got: {status.get('version', 'unknown')}"
            print(f"❌ {error_msg}")
            print("\n🚫 Altinity startup failed: MCP server version mismatch")
            print("💡 Start the MCP server with the correct version first")
            os._exit(1)
            
    except Exception as e:
        error_msg = f"Cannot connect to MCP server: {str(e)}"
        print(f"❌ {error_msg}")
        print("\n🚫 Altinity startup failed: MCP server not running")
        print("💡 Start the MCP server first before starting Altinity")
        os._exit(1)