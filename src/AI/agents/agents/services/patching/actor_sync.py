"""
Actor sync service for datamodel artifact synchronization.
Handles post-SoT-edit synchronization of generated artifacts.
"""

import asyncio
from typing import Dict, List, Any, Optional
from pathlib import Path

from shared.utils.logging_utils import get_logger
from agents.schemas.plan_schema import PlanStep
log = get_logger(__name__)


class SyncError(Exception):
    """Raised when artifact synchronization fails"""
    def __init__(self, message: str, sync_response: Optional[Dict] = None):
        self.message = message
        self.sync_response = sync_response
        super().__init__(message)


async def sync_generated_artifacts(
    plan: PlanStep,
    repo_path: str,
    mcp_client,
    check_only: bool = False,
    gitea_token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synchronize generated artifacts after Source of Truth edits.
    
    Args:
        plan: The plan step that was executed
        repo_path: Repository root path
        mcp_client: MCP client for calling datamodel_sync tool
        check_only: Only check if sync needed, don't generate
        
    Returns:
        Dictionary with sync results
        
    Raises:
        SyncError: If synchronization fails
    """
    context = plan.context
    
    # Determine if this plan touches Source of Truth files
    sot_files_touched = _get_sot_files_from_plan(plan, context.source_of_truth)
    
    if not sot_files_touched:
        log.info("No Source of Truth files touched, skipping artifact sync")
        return {"status": "noop", "reason": "no_sot_changes"}
    
    log.info(f"Source of Truth files touched: {sot_files_touched}, syncing artifacts...")
    
    # Sync artifacts for each touched SoT file
    all_results = []
    for sot_file in sot_files_touched:
        try:
            result = await _sync_single_file(
                sot_file, repo_path, mcp_client, check_only, gitea_token
            )
            all_results.append(result)
            
            if result["status"] == "error":
                raise SyncError(
                    f"Sync failed for {sot_file}: {result.get('errors', [])}",
                    result
                )
                
        except Exception as e:
            log.error(f"Failed to sync artifacts for {sot_file}: {e}")
            raise SyncError(f"Sync failed for {sot_file}: {e}")
    
    # Aggregate results
    total_generated = sum(len(r.get("generated", [])) for r in all_results)
    all_warnings = []
    all_errors = []
    
    for result in all_results:
        all_warnings.extend(result.get("warnings", []))
        all_errors.extend(result.get("errors", []))
    
    # Determine overall status
    if all_errors:
        overall_status = "error"
    elif total_generated > 0:
        overall_status = "changed"
    elif all(r["status"] in ["noop", "ok"] for r in all_results):
        overall_status = "ok"
    else:
        overall_status = "changed"
    
    summary = {
        "status": overall_status,
        "files_synced": len(sot_files_touched),
        "artifacts_generated": total_generated,
        "warnings": all_warnings,
        "errors": all_errors,
        "details": all_results
    }
    
    log.info(f"Artifact sync complete: {overall_status}, {total_generated} artifacts generated")
    return summary


async def _sync_single_file(
    sot_file: str,
    repo_path: str,
    mcp_client,
    check_only: bool,
    gitea_token: Optional[str] = None,
) -> Dict[str, Any]:
    """Sync artifacts for a single Source of Truth file."""
    
    from pathlib import Path
    
    # Get current branch name for logging only (no enforcement needed)
    import subprocess
    try:
        result = subprocess.run(['git', 'branch', '--show-current'], 
                              cwd=repo_path, capture_output=True, text=True)
        current_branch = result.stdout.strip() if result.returncode == 0 else "unknown"
    except:
        current_branch = "unknown"
    
    if not check_only:
        log.info(f"📦 Generating artifacts on branch: {current_branch}")
    
    # Prepare sync request
    # Read schema file content since MCP server is remote and doesn't have file access
    full_schema_path = Path(repo_path) / sot_file
    try:
        with open(full_schema_path, 'r', encoding='utf-8') as f:
            schema_content = f.read()
    except Exception as e:
        log.error(f"Failed to read schema file {full_schema_path}: {e}")
        return {
            "status": "error",
            "generated": [],
            "warnings": [],
            "errors": [f"Failed to read schema file: {e}"]
        }
    
    # Extract just the filename for the MCP tool
    schema_filename = full_schema_path.name
    
    sync_request = {
        "schema_content": schema_content,
        "schema_filename": schema_filename,
    }
    
    log.debug(f"Calling datamodel_sync with: {sync_request}")
    
    # Call MCP tool with langfuse tracking
    from langfuse import get_client
    langfuse = get_client()
    with langfuse.start_as_current_span(name="tool_datamodel_sync", metadata={"span_type": "TOOL"}, input=sync_request) as span:
        try:
            result = await mcp_client.call_tool("datamodel_sync", sync_request, gitea_token=gitea_token)
            span.update(output={"result": result})
            
            # Handle CallToolResult objects with structured_content
            if hasattr(result, 'structured_content') and result.structured_content:
                # CallToolResult object with pre-parsed structured content
                sync_response = result.structured_content
            elif hasattr(result, 'content'):
                # CallToolResult object (newer MCP versions)
                content = result.content
                if isinstance(content, str):
                    # JSON string - parse it
                    import json
                    sync_response = json.loads(content)
                elif isinstance(content, list) and len(content) > 0:
                    # List of response objects
                    first_item = content[0]
                    if hasattr(first_item, 'text'):
                        # Parse JSON from text attribute
                        import json
                        sync_response = json.loads(first_item.text)
                    else:
                        sync_response = first_item
                else:
                    sync_response = content
            elif isinstance(result, list) and len(result) > 0:
                # Legacy list format (older MCP versions)
                sync_response = result[0].text if hasattr(result[0], 'text') else result[0]
                if isinstance(sync_response, str):
                    import json
                    sync_response = json.loads(sync_response)
            else:
                # Direct dict response (fallback)
                sync_response = result
                
            # Handle nested result structure (like server_info)
            if isinstance(sync_response, dict) and 'result' in sync_response and isinstance(sync_response['result'], dict):
                sync_response = sync_response['result']
                
            # Artifact generation happens as part of the same commit as schema changes
            
            log.debug(f"Sync response for {sot_file}: {sync_response}")
            
            # If not check_only and we have generated files, write them to disk
            if not check_only and sync_response.get("status") == "ok":
                generated_files = sync_response.get("generated", [])
                repo_base = Path(repo_path)
                
                # Determine the directory where schema file is located
                schema_path = repo_base / sot_file
                schema_dir = schema_path.parent
                
                for generated_file in generated_files:
                    file_path = generated_file.get("path", "")
                    file_content = generated_file.get("content", "")
                    
                    if file_path and file_content:
                        # Write file to the same directory as the schema
                        full_file_path = schema_dir / file_path
                        
                        try:
                            with open(full_file_path, 'w', encoding='utf-8') as f:
                                f.write(file_content)
                            log.info(f"✅ Wrote generated file: {full_file_path}")
                        except Exception as e:
                            log.error(f"❌ Failed to write {full_file_path}: {e}")
                            # Add error to response
                            if "errors" not in sync_response:
                                sync_response["errors"] = []
                            sync_response["errors"].append(f"Failed to write {file_path}: {e}")
                            sync_response["status"] = "error"
            
            return sync_response
            
        except Exception as e:
            log.error(f"MCP call failed for {sot_file}: {e}")
            return {
                "status": "error",
                "generated": [],
                "warnings": [],
                "errors": [f"MCP call failed: {e}"]
            }


def _get_sot_files_from_plan(plan: PlanStep, source_of_truth: str) -> List[str]:
    """Extract Source of Truth files from plan operations"""
    sot_files = []
    
    if not source_of_truth:
        log.warning("No source_of_truth specified in plan context")
        return sot_files
    
    # Only support JSON schema files (Altinn standard)
    if source_of_truth == "json_schema":
        sot_patterns = [r'.*\.schema\.json$']
    else:
        log.warning(f"Unsupported source_of_truth: {source_of_truth}")
        return sot_files
    
    # Check files_to_touch for SoT files
    import re
    for file_path in plan.files_to_touch:
        for pattern in sot_patterns:
            if re.match(pattern, file_path):
                sot_files.append(file_path)
                break
    
    # Also check operations for SoT file modifications
    for op in plan.ops:
        op_file = None
        if hasattr(op, 'file'):
            op_file = op.file
        elif isinstance(op, dict):
            op_file = op.get('file')
        
        if op_file:
            for pattern in sot_patterns:
                if re.match(pattern, op_file) and op_file not in sot_files:
                    sot_files.append(op_file)
                    break
    
    return sot_files


def should_sync_artifacts(plan: PlanStep) -> bool:
    """
    Determine if artifact sync should be performed for this plan.
    
    Args:
        plan: The plan step
        
    Returns:
        True if sync should be performed
    """
    # Always sync if Source of Truth files are touched
    sot_files = _get_sot_files_from_plan(plan, plan.context.source_of_truth)
    
    if sot_files:
        return True
    
    # Also sync if this is explicitly a datamodel sync task
    if "sync" in plan.task_type.lower() and "datamodel" in plan.task_type.lower():
        return True
    
    return False


async def check_artifacts_in_sync(
    repo_path: str,
    context,
    mcp_client,
    gitea_token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Check if all datamodel artifacts are in sync with Source of Truth.
    
    Args:
        repo_path: Repository root path
        context: Plan context with source_of_truth info
        mcp_client: MCP client
        
    Returns:
        Dictionary with sync status
    """
    # Find all SoT files in the repository (only JSON schema files for Altinn)
    repo = Path(repo_path)
    models_dir = repo / "App" / "models"
    
    if not models_dir.exists():
        return {"in_sync": True, "reason": "no_models_directory"}
    
    # Only check JSON schema files
    sot_files = list(models_dir.glob("*.schema.json"))
    
    if not sot_files:
        return {"in_sync": True, "reason": "no_source_files_found"}
    
    # Check each SoT file for sync status
    out_of_sync_files = []
    for sot_file in sot_files:
        relative_path = str(sot_file.relative_to(repo))
        
        try:
            result = await _sync_single_file(
                relative_path, repo_path, mcp_client, check_only=True, gitea_token=gitea_token
            )
            
            status = result.get("status", "unknown")
            if status == "error":
                out_of_sync_files.append({
                    "file": relative_path,
                    "reason": "check_failed",
                    "error": str(result.get("errors", ["Unknown error"])[0] if result.get("errors") else "Sync check failed")
                })
            elif status == "changed":
                out_of_sync_files.append({
                    "file": relative_path,
                    "reason": "artifacts_out_of_sync"
                })
                
        except Exception as e:
            out_of_sync_files.append({
                "file": relative_path,
                "reason": "check_failed",
                "error": str(e)
            })
    
    return {
        "in_sync": len(out_of_sync_files) == 0,
        "out_of_sync_files": out_of_sync_files,
        "total_checked": len(sot_files)
    }
