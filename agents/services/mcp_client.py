"""
MCP Client - Streamlined Core Module
Handles MCP server connection and orchestrates patch generation workflow.
"""

import logging
import time
import mlflow
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from agents.services.patch_generator import PatchGenerator
from agents.services.patch_validator import PatchValidator
from agents.services.patch_normalizer import normalize_patch_structure
from agents.services import repo_scanner

log = logging.getLogger(__name__)


class MCPClient:
    """Client for interacting with MCP (Model Context Protocol) servers."""
    
    def __init__(self, server_url: str = "http://localhost:8069"):
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
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """Call an MCP tool and return the result."""
        try:
            client = await self._get_client()
            async with client:
                result = await client.call_tool(tool_name, arguments)
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
            # Step 1: Scan repository
            with mlflow.start_span(name="repo_scan", span_type="TOOL") as scan_span:
                repo_facts = await repo_scanner.scan_repository(self, repository_path)
                layout_context = await repo_scanner.get_layout_context(self, repository_path, repo_facts)
                scan_span.set_outputs({"repo_facts": repo_facts})
            
            # Step 2: Connect to MCP server
            await self.connect()
            
            # Step 3: Get planning guidance
            planning_guidance = None
            with mlflow.start_span(name="get_planning_guidance", span_type="TOOL") as planning_span:
                try:
                    planning_result = await self.call_tool('planning_tool', {})
                    
                    # Extract text from MCP response
                    if planning_result and isinstance(planning_result, list) and len(planning_result) > 0:
                        if hasattr(planning_result[0], 'text'):
                            planning_guidance = planning_result[0].text
                    
                    planning_span.set_outputs({
                        "guidance_length": len(str(planning_guidance)) if planning_guidance else 0
                    })
                    log.info("Retrieved planning guidance from MCP planning_tool")
                except Exception as e:
                    planning_span.set_attribute("error", str(e))
                    log.warning(f"Could not get planning guidance: {e}")
                
                # Step 4: Generate patch using LLM
                generator = PatchGenerator(self, repository_path)
                
                repo_facts_with_context = {
                    **repo_facts,
                    'layout_context': layout_context
                }
                
                patch_data = await generator.generate_patch(
                    task_context,
                    repo_facts_with_context,
                    planning_guidance
                )
                
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


# Singleton instance
_mcp_client_instance: MCPClient | None = None


def get_mcp_client(server_url: str = "http://localhost:8069/sse") -> MCPClient:
    """Get or create the singleton MCP client instance."""
    global _mcp_client_instance
    
    if _mcp_client_instance is None:
        _mcp_client_instance = MCPClient(server_url)
    
    return _mcp_client_instance
