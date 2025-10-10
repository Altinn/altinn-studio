"""
MCP-based verification service that calls validation tools.
Similar to patch_generator.py but for verification phase.
"""
import json
import mlflow
from pathlib import Path
from typing import Dict, List, Any
from agents.services.mcp.mcp_client import get_mcp_client
from agents.services.llm import LLMClient
from agents.schemas.plan_schema import PlanStep
from agents.services.telemetry import (
    SpanTypes, capture_tool_output, create_tool_span, format_as_markdown, is_json
)
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


class MCPVerificationResult:
    """Structured verification result from MCP tools"""
    def __init__(self):
        self.passed = True
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.checks: Dict[str, bool] = {}
        self.tool_results: List[Dict] = []
    
    def add_error(self, check_name: str, message: str):
        self.passed = False
        self.errors.append(f"{check_name}: {message}")
        self.checks[check_name] = False
    
    def add_warning(self, check_name: str, message: str):
        self.warnings.append(f"{check_name}: {message}")
    
    def add_success(self, check_name: str):
        self.checks[check_name] = True


class MCPVerifier:
    """MCP-based verifier that calls validation tools"""
    
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
    
    async def verify_with_tools(self, patch: Dict, plan_step: PlanStep) -> MCPVerificationResult:
        """
        Run verification using MCP validation tools.
        This will show up in MLflow traces as tool calls.
        """
        with mlflow.start_span(name="verification_phase") as main_span:
            main_span.set_attributes({
                "changed_files_count": len([f.get('file', '') for f in patch.get('changes', [])]),
                "plan_step_id": plan_step.id if hasattr(plan_step, "id") else "unknown"
            })
            
            result = MCPVerificationResult()
        
        try:
            mcp_client = get_mcp_client()
            
            # Only call validation tools for files that actually changed
            changed_files = [f.get('file', '') for f in patch.get('changes', [])]
            log.info(f"Running selective verification for {len(changed_files)} changed files: {changed_files}")
            
            # 1. Layout validation (only if layout files changed)
            layout_files = [f for f in patch.get('changes', []) if 'layout' in f.get('file', '')]
            if layout_files:
                log.info(f"Calling layout validator for {len(layout_files)} layout files")
                await self._verify_layout(mcp_client, layout_files, plan_step, result)
            else:
                result.add_success("layout_validation_skipped")
            
            # 2. Resource validation (only if resource files changed)
            resource_files = [f for f in patch.get('changes', []) if 'resource.' in f.get('file', '')]
            if resource_files:
                log.info(f"Calling resource validator for {len(resource_files)} resource files")
                await self._verify_resources(mcp_client, resource_files, plan_step, result)
            else:
                result.add_success("resource_validation_skipped")
            
            # 4. Policy validation (only if actual policy files are being modified)
            policy_files = [f for f in changed_files if 'policy' in f.lower() or 'rule' in f.lower()]
            if policy_files:
                log.info("Calling policy validator for policy file changes")
                await self._verify_policies(mcp_client, patch, plan_step, result)
            else:
                log.info("Skipping policy validation - no policy files changed")
                result.add_success("policy_validation_skipped")
            
            log.info(f"✅ MCP verification complete: {len(result.errors)} errors, {len(result.warnings)} warnings")
            
            # Add final verification summary
            main_span.set_outputs({
                "verification_summary": {
                    "success": result.passed,
                    "error_count": len(result.errors),
                    "warning_count": len(result.warnings),
                    "checks_completed": list(result.checks.keys()),
                    "errors": result.errors,
                    "warnings": result.warnings
                }
            })
            
        except Exception as e:
            log.error(f"MCP verification failed: {e}")
            result.add_error("mcp_verification", f"Tool execution failed: {e}")
            if 'main_span' in locals():
                main_span.set_status("ERROR")
                main_span.set_outputs({
                    "error": str(e),
                    "verification_summary": {
                        "success": False,
                        "error": str(e)
                    }
                })
        
        return result
    
    async def _verify_layout(self, mcp_client, layout_files: List[Dict], plan_step: PlanStep, result: MCPVerificationResult):
        """Call schema_validator_tool for layout validation"""
        with mlflow.start_span(name="layout_schema_validation", span_type="TOOL") as span:
            try:
                # Read the layout file content
                layout_file_path = Path(self.repo_path) / layout_files[0]['file']
                with open(layout_file_path, 'r') as f:
                    layout_content = f.read()
                
                tool_input = {
                    "json_obj": layout_content,
                    "schema_path": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"
                }
                
                # Set detailed inputs
                span.set_attributes({
                    "file_path": layout_files[0]['file'],
                    "validation_type": "layout_schema",
                    "tool": "schema_validator_tool"
                })
                span.set_inputs({
                    "tool_parameters": tool_input,
                    "file_content": layout_content[:500] + "..." if len(layout_content) > 500 else layout_content
                })
                
                # Call the tool
                layout_result = await mcp_client.call_tool("schema_validator_tool", tool_input)
                
                # Format the output for multiple views
                # Handle CallToolResult objects with structured_content
                if hasattr(layout_result, 'structured_content') and layout_result.structured_content:
                    result_text = json.dumps(layout_result.structured_content)
                    result_json = layout_result.structured_content
                elif hasattr(layout_result, 'text'):
                    result_text = layout_result.text
                    try:
                        result_json = json.loads(result_text)
                    except:
                        result_json = None
                elif isinstance(layout_result, list) and len(layout_result) > 0 and hasattr(layout_result[0], 'text'):
                    result_text = layout_result[0].text
                    try:
                        result_json = json.loads(result_text)
                    except:
                        result_json = None
                else:
                    result_text = str(layout_result)
                    result_json = layout_result if isinstance(layout_result, dict) else None
                    
                span.set_outputs({
                    "raw_result": result_text,
                    "formats": {
                        "text": result_text,
                        "markdown": format_as_markdown(result_text),
                        "json": result_json
                    }
                })
                result.tool_results.append({"tool": "schema_validator_tool", "result": layout_result})
                
                # Handle various MCP response formats (list, dict, TextContent, CallToolResult)
                if hasattr(layout_result, 'structured_content') and layout_result.structured_content:
                    layout_data = layout_result.structured_content
                elif isinstance(layout_result, list):
                    # If it's a list, get first item
                    layout_data = layout_result[0] if layout_result else {}
                    # If first item is TextContent, get its text and parse
                    if hasattr(layout_data, 'text'):
                        layout_data = json.loads(layout_data.text)
                elif hasattr(layout_result, 'text'):
                    # Direct TextContent response
                    layout_data = json.loads(layout_result.text)
                else:
                    layout_data = layout_result
                
                if layout_data.get("valid", True):
                    result.add_success("layout_validation")
                else:
                    for error in layout_data.get("errors", []):
                        result.add_error("layout_validation", error)
                        
            except Exception as e:
                result.add_error("layout_validation", f"Tool call failed: {e}")
    
    async def _verify_resources(self, mcp_client, resource_files: List[Dict], plan_step: PlanStep, result: MCPVerificationResult):
        """Call resource_validator_tool"""
        with mlflow.start_span(name="resource_text_validation", span_type="TOOL") as span:
            try:
                # Read the resource file content
                resource_file_path = Path(self.repo_path) / resource_files[0]['file']
                with open(resource_file_path, 'r') as f:
                    resource_content = f.read()
                
                # Determine language from filename (e.g., resource.nb.json -> nb)
                filename = resource_files[0]['file'].split('/')[-1]
                language = "nb"  # default
                if "resource." in filename and ".json" in filename:
                    parts = filename.split('.')
                    if len(parts) >= 3:
                        language = parts[1]
                
                tool_input = {
                    "resource_json": resource_content,
                    "language": language,
                    "repo_path": self.repo_path
                }
                
                # Set detailed inputs
                span.set_attributes({
                    "file_path": resource_files[0]['file'],
                    "validation_type": "resource_text",
                    "tool": "resource_validator_tool",
                    "language": language
                })
                span.set_inputs({
                    "tool_parameters": tool_input,
                    "resource_content": resource_content[:500] + "..." if len(resource_content) > 500 else resource_content
                })
                
                # Call the tool
                resource_result = await mcp_client.call_tool("resource_validator_tool", tool_input)
                
                # Format the output for multiple views
                # Handle CallToolResult objects with structured_content
                if hasattr(resource_result, 'structured_content') and resource_result.structured_content:
                    result_text = json.dumps(resource_result.structured_content)
                    result_json = resource_result.structured_content
                elif hasattr(resource_result, 'text'):
                    result_text = resource_result.text
                    try:
                        result_json = json.loads(result_text)
                    except:
                        result_json = None
                elif isinstance(resource_result, list) and len(resource_result) > 0 and hasattr(resource_result[0], 'text'):
                    result_text = resource_result[0].text
                    try:
                        result_json = json.loads(result_text)
                    except:
                        result_json = None
                else:
                    result_text = str(resource_result)
                    result_json = resource_result if isinstance(resource_result, dict) else None
                    
                span.set_outputs({
                    "raw_result": result_text,
                    "formats": {
                        "text": result_text,
                        "markdown": format_as_markdown(result_text),
                        "json": result_json
                    }
                })
                result.tool_results.append({"tool": "resource_validator_tool", "result": resource_result})
                
                # Handle various MCP response formats (list, dict, TextContent, CallToolResult)
                if hasattr(resource_result, 'structured_content') and resource_result.structured_content:
                    resource_data = resource_result.structured_content
                elif isinstance(resource_result, list):
                    resource_data = resource_result[0] if resource_result else {}
                    if hasattr(resource_data, 'text'):
                        resource_data = json.loads(resource_data.text)
                elif hasattr(resource_result, 'text'):
                    resource_data = json.loads(resource_result.text)
                else:
                    resource_data = resource_result
                
                if resource_data.get("valid", True):
                    result.add_success("resource_validation")
                else:
                    for error in resource_data.get("errors", []):
                        result.add_error("resource_validation", error)
                        
            except Exception as e:
                result.add_error("resource_validation", f"Tool call failed: {e}")
    
    async def _verify_policies(self, mcp_client, patch: Dict, plan_step: PlanStep, result: MCPVerificationResult):
        """Call policy_validation_tool for generated files and constraint checks"""
        with mlflow.start_span(name="policy_validation", span_type="TOOL") as span:
            try:
                tool_input = {
                    "changed_files": [f['file'] for f in patch.get('changes', [])],
                    "repository_path": self.repo_path
                }
                
                # Add plan constraints
                if plan_step.constraints:
                    tool_input["constraints"] = {
                        "forbid_generated_edits": plan_step.constraints.forbid_generated_edits,
                        "max_files": plan_step.constraints.max_files,
                        "max_diff_lines": plan_step.constraints.max_diff_lines
                    }
                
                span.set_inputs(tool_input)
                policy_result = await mcp_client.call_tool("policy_validation_tool", tool_input)
                
                # Handle CallToolResult objects with structured_content
                if hasattr(policy_result, 'structured_content') and policy_result.structured_content:
                    policy_data = policy_result.structured_content
                else:
                    policy_data = policy_result
                
                span.set_outputs({"result": policy_data})
                result.tool_results.append({"tool": "policy_validation_tool", "result": policy_data})
                
                if policy_data.get("valid", True):
                    result.add_success("policy_validation")
                else:
                    for error in policy_data.get("errors", []):
                        result.add_error("policy_validation", error)
                        
            except Exception as e:
                result.add_error("policy_validation", f"Tool call failed: {e}")


async def run_mcp_verification(patch: Dict, plan_step: PlanStep, repository_path: str) -> MCPVerificationResult:
    """
    Main entry point for MCP-based verification.
    This will show tool calls in MLflow traces.
    """
    verifier = MCPVerifier(repository_path)
    return await verifier.verify_with_tools(patch, plan_step)
