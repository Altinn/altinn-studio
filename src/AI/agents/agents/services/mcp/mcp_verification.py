"""
MCP-based verification service that calls validation tools.
Similar to patch_generator.py but for verification phase.
"""
import json
from pathlib import Path
from langfuse import get_client
from typing import Dict, List, Any
from agents.services.mcp.mcp_client import get_mcp_client
from agents.services.llm import LLMClient
from agents.schemas.plan_schema import PlanStep
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
        This will show up in Langfuse traces as tool calls.
        
        Args:
            patch: The patch data with changes
            plan_step: The plan step being verified
        """
        langfuse = get_client()
        result = MCPVerificationResult()
        
        with langfuse.start_as_current_span(name="verification_phase", metadata={"span_type": "TOOL"}) as main_span:
            main_span.update(metadata={
                "changed_files_count": len([f.get('file', '') for f in patch.get('changes', [])]),
                "plan_step_id": plan_step.id if hasattr(plan_step, "id") else "unknown"
            })
        
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
                
                # 3. Settings.json validation (critical - catches broken JSON that causes 500 errors)
                layout_settings_files = [f for f in patch.get('changes', []) if f.get('file', '').endswith('Settings.json') and 'ui/form' in f.get('file', '')]
                if layout_settings_files:
                    log.info(f"Validating Settings.json for {len(layout_settings_files)} file(s)")
                    await self._verify_layout_settings(layout_settings_files, result)
                else:
                    result.add_success("layout_settings_validation_skipped")
                
                # 4. Policy validation (only if actual policy files are being modified)
                policy_files = [f for f in changed_files if 'policy' in f.lower() or 'rule' in f.lower()]
                if policy_files:
                    log.info("Calling policy validator for policy file changes")
                    await self._verify_policies(mcp_client, patch, plan_step, result)
                else:
                    log.info("Skipping policy validation - no policy files changed")
                    result.add_success("policy_validation_skipped")
                
                icon = "✅" if result.passed else "⚠️"
                log.info(f"{icon} MCP verification complete: {len(result.errors)} errors, {len(result.warnings)} warnings")
                
                # Add final verification summary
                main_span.update(output={
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
                main_span.update(level="ERROR", output={
                    "error": str(e),
                    "verification_summary": {
                        "success": False,
                        "error": str(e)
                    }
                })
        
        return result
    
    async def _verify_layout(self, mcp_client, layout_files: List[Dict], plan_step: PlanStep, result: MCPVerificationResult):
        """Call altinn_layout_validate for each changed layout file"""
        langfuse = get_client()
        for layout_entry in layout_files:
            file_path = layout_entry['file']
            with langfuse.start_as_current_span(name="layout_schema_validation", metadata={"span_type": "TOOL", "file_path": file_path}) as span:
                try:
                    layout_file_path = Path(self.repo_path) / file_path
                    with open(layout_file_path, 'r') as f:
                        layout_content = f.read()
                    
                    tool_input = {"json_content": layout_content}
                    span.update(input={
                        "tool_parameters": tool_input,
                        "file_content": layout_content[:500] + "..." if len(layout_content) > 500 else layout_content,
                    })
                    
                    layout_result = await mcp_client.call_tool("altinn_layout_validate", tool_input)
                    
                    # Extract structured data from MCP response
                    layout_data = self._extract_mcp_result(layout_result)
                    span.update(output={"result": layout_data})
                    result.tool_results.append({"tool": "altinn_layout_validate", "file": file_path, "result": layout_result})
                    
                    if layout_data.get("valid", True):
                        result.add_success(f"layout_validation:{file_path}")
                    else:
                        for error in layout_data.get("errors", []):
                            result.add_error("layout_validation", f"{file_path}: {error}")
                            
                except Exception as e:
                    result.add_error("layout_validation", f"{file_path}: Tool call failed: {e}")
    
    async def _verify_resources(self, mcp_client, resource_files: List[Dict], plan_step: PlanStep, result: MCPVerificationResult):
        """Call altinn_resource_validate for each changed resource file"""
        langfuse = get_client()
        for resource_entry in resource_files:
            file_path = resource_entry['file']
            with langfuse.start_as_current_span(name="resource_text_validation", metadata={"span_type": "TOOL", "file_path": file_path}) as span:
                try:
                    resource_file_path = Path(self.repo_path) / file_path
                    with open(resource_file_path, 'r') as f:
                        resource_content = f.read()
                    
                    # Determine language from filename (e.g., resource.nb.json -> nb)
                    filename = file_path.split('/')[-1]
                    language = "nb"  # default
                    if "resource." in filename and ".json" in filename:
                        parts = filename.split('.')
                        if len(parts) >= 3:
                            language = parts[1]
                    
                    tool_input = {
                        "resource_json": resource_content,
                        "language": language,
                    }
                    span.update(input={
                        "tool_parameters": tool_input,
                        "resource_content": resource_content[:500] + "..." if len(resource_content) > 500 else resource_content,
                    })
                    
                    resource_result = await mcp_client.call_tool("altinn_resource_validate", tool_input)
                    
                    # Extract structured data from MCP response
                    resource_data = self._extract_mcp_result(resource_result)
                    span.update(output={"result": resource_data})
                    result.tool_results.append({"tool": "altinn_resource_validate", "file": file_path, "result": resource_result})
                    
                    if resource_data.get("valid", True):
                        result.add_success(f"resource_validation:{file_path}")
                    else:
                        for error in resource_data.get("errors", []):
                            result.add_error("resource_validation", f"{file_path}: {error}")
                            
                except Exception as e:
                    result.add_error("resource_validation", f"{file_path}: Tool call failed: {e}")
    
    async def _verify_layout_settings(self, layout_settings_files: List[Dict], result: MCPVerificationResult):
        """Validate Settings.json for correct JSON syntax and structure"""
        langfuse = get_client()
        with langfuse.start_as_current_span(name="layout_settings_validation", metadata={"span_type": "TOOL"}) as span:
            try:
                # Read the Settings.json file content
                settings_file_path = Path(self.repo_path) / layout_settings_files[0]['file']
                with open(settings_file_path, 'r') as f:
                    settings_content = f.read()
                
                span.update(metadata={
                    "file_path": layout_settings_files[0]['file'],
                    "validation_type": "layout_settings_json",
                })
                span.update(input={
                    "file_content": settings_content[:500] + "..." if len(settings_content) > 500 else settings_content,
                })
                
                # Parse JSON to check for syntax errors
                try:
                    settings_data = json.loads(settings_content)
                except json.JSONDecodeError as e:
                    error_msg = f"Invalid JSON syntax in Settings.json: {e.msg} at line {e.lineno}, column {e.colno}"
                    result.add_error("layout_settings_validation", error_msg)
                    span.update(output={"valid": False, "error": error_msg})
                    return
                
                # Validate structure
                errors = []
                
                # Check for required "pages" key
                if "pages" not in settings_data:
                    errors.append("Missing required 'pages' key in Settings.json")
                elif not isinstance(settings_data["pages"], dict):
                    errors.append("'pages' must be an object/dict")
                else:
                    pages = settings_data["pages"]
                    
                    # Check for "order" array
                    if "order" not in pages:
                        errors.append("Missing required 'pages.order' array")
                    elif not isinstance(pages["order"], list):
                        errors.append("'pages.order' must be an array")
                    else:
                        order = pages["order"]
                        
                        # Check for duplicates
                        if len(order) != len(set(order)):
                            duplicates = [page for page in order if order.count(page) > 1]
                            errors.append(f"Duplicate page names in order array: {set(duplicates)}")
                        
                        # Check for empty array
                        if len(order) == 0:
                            errors.append("'pages.order' array is empty - must contain at least one page")
                        
                        # Check that all entries are strings
                        non_strings = [page for page in order if not isinstance(page, str)]
                        if non_strings:
                            errors.append(f"All page names must be strings, found: {non_strings}")
                
                if errors:
                    for error in errors:
                        result.add_error("layout_settings_validation", error)
                    span.update(output={"valid": False, "errors": errors})
                else:
                    result.add_success("layout_settings_validation")
                    span.update(output={"valid": True, "page_count": len(settings_data.get("pages", {}).get("order", []))})
                    log.info(f"✅ Settings.json is valid with {len(settings_data['pages']['order'])} pages")
                        
            except Exception as e:
                result.add_error("layout_settings_validation", f"Validation failed: {e}")
                span.update(output={"valid": False, "error": str(e)})
    
    async def _verify_policies(self, mcp_client, patch: Dict, plan_step: PlanStep, result: MCPVerificationResult):
        """Call altinn_policy_validate for generated files and constraint checks"""
        langfuse = get_client()
        with langfuse.start_as_current_span(name="policy_validation", metadata={"span_type": "TOOL"}) as span:
            try:
                tool_input = {
                    "changed_files": [f['file'] for f in patch.get('changes', [])],
                    "repository_path": self.repo_path
                }
                
                # Add plan constraints
                if plan_step and getattr(plan_step, "constraints", None):
                    tool_input["constraints"] = {
                        "forbid_generated_edits": plan_step.constraints.forbid_generated_edits,
                        "max_files": plan_step.constraints.max_files,
                        "max_diff_lines": plan_step.constraints.max_diff_lines,
                    }

                span.update(input=tool_input)
                policy_result = await mcp_client.call_tool("altinn_policy_validate", tool_input)
                
                # Handle CallToolResult objects with structured_content
                if hasattr(policy_result, 'structured_content') and policy_result.structured_content:
                    policy_data = policy_result.structured_content
                else:
                    policy_data = policy_result
                
                span.update(output={"result": policy_data})
                result.tool_results.append({"tool": "altinn_policy_validate", "result": policy_data})
                
                if policy_data.get("valid", True):
                    result.add_success("policy_validation")
                else:
                    for error in policy_data.get("errors", []):
                        result.add_error("policy_validation", error)
                        
            except Exception as e:
                result.add_error("policy_validation", f"Tool call failed: {e}")


    @staticmethod
    def _extract_mcp_result(mcp_response) -> dict:
        """Extract a plain dict from various MCP response formats."""
        if hasattr(mcp_response, 'structured_content') and mcp_response.structured_content:
            return mcp_response.structured_content
        if isinstance(mcp_response, list) and mcp_response:
            first = mcp_response[0]
            if hasattr(first, 'text'):
                try:
                    return json.loads(first.text)
                except json.JSONDecodeError:
                    return {}
            return first if isinstance(first, dict) else {}
        if hasattr(mcp_response, 'text'):
            try:
                return json.loads(mcp_response.text)
            except json.JSONDecodeError:
                return {}
        return mcp_response if isinstance(mcp_response, dict) else {}


async def run_mcp_verification(patch: Dict, plan_step: PlanStep, repository_path: str) -> MCPVerificationResult:
    """
    Main entry point for MCP-based verification.
    This will show tool calls in Langfuse traces.
    """
    verifier = MCPVerifier(repository_path)
    return await verifier.verify_with_tools(patch, plan_step)
