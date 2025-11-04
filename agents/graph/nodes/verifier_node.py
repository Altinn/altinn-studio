"""Verifier node implementation using the verifier workflow pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Any

from agents.graph.state import AgentState
from agents.services.events import AgentEvent
from agents.services.events import sink
from agents.services.llm import LLMClient
from agents.prompts import get_prompt_content, render_template
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


async def handle(state: AgentState) -> AgentState:
    """Handle the verifier node execution.

    Args:
        state: Current agent state

    Returns:
        Updated agent state
    """
    log.info("🔍 Verifier node executing")

    # Check if workflow should stop
    if state.next_action == "stop":
        log.info("⏹️ Workflow stopping at verifier - passing through")
        return state

    try:
        if not state.changed_files:
            log.info("⏭️ Skipping verification - no files were changed")
            state.tests_passed = True  # No changes means no failures
            state.verify_notes = ["No verification needed - no changes were made"]
            state.next_action = "stop"  # Stop the workflow since no changes were made
            return state

        # Use MCP verification with auto-fix loop
        from agents.services.mcp.mcp_verification import MCPVerifier
        
        verifier = MCPVerifier(state.repo_path)
        patch = {
            "changes": [{"file": f, "op": "modify"} for f in state.changed_files]
        }
        
        # Try verification with auto-fix (max 3 attempts)
        max_fix_attempts = 3
        fix_attempt = 0
        
        while fix_attempt < max_fix_attempts:
            result = await verifier.verify_with_tools(patch, {})
            
            if result.passed:
                log.info("✅ Verification passed")
                state.tests_passed = True
                state.verify_notes = ["All validations passed"]
                if fix_attempt > 0:
                    state.verify_notes.append(f"Auto-fixed after {fix_attempt} attempt(s)")
                break
            
            # Validation failed - attempt auto-fix if this isn't the last attempt
            fix_attempt += 1
            if fix_attempt >= max_fix_attempts:
                log.warning(f"❌ Validation failed after {max_fix_attempts} attempts")
                state.tests_passed = False
                state.verify_notes = [str(error) for error in result.errors]
                break
            
            log.warning(f"⚠️ Validation failed (attempt {fix_attempt}/{max_fix_attempts}), attempting auto-fix...")
            
            # Attempt to auto-fix the validation errors
            fix_applied = await _attempt_auto_fix(state, result)
            
            if not fix_applied:
                log.warning("Could not generate auto-fix, stopping attempts")
                state.tests_passed = False
                state.verify_notes = [str(error) for error in result.errors]
                break
            
            log.info("✅ Auto-fix applied, re-running verification...")
        
        state.next_action = "review"

        
    except Exception as exc:
        sink.send(
            AgentEvent(
                type="error",
                session_id=state.session_id,
                data={"message": f"Verifier failed: {exc}"},
            )
        )
        state.next_action = "stop"

    return state


async def _attempt_auto_fix(state: AgentState, verification_result) -> bool:
    """
    Attempt to automatically fix validation errors.
    
    Args:
        state: Current agent state
        verification_result: MCPVerificationResult with structured errors
        
    Returns:
        True if fix was applied, False otherwise
    """
    try:
        # Extract structured validation errors from tool results
        validation_errors = []
        affected_files = set()
        
        for tool_result in verification_result.tool_results:
            tool_name = tool_result.get("tool", "")
            result_data = tool_result.get("result", {})
            
            # Handle different MCP response formats
            if hasattr(result_data, 'structured_content'):
                result_dict = result_data.structured_content
            elif hasattr(result_data, 'text'):
                try:
                    result_dict = json.loads(result_data.text)
                except:
                    result_dict = {}
            elif isinstance(result_data, list) and len(result_data) > 0:
                if hasattr(result_data[0], 'text'):
                    try:
                        result_dict = json.loads(result_data[0].text)
                    except:
                        result_dict = {}
                else:
                    result_dict = result_data[0] if isinstance(result_data[0], dict) else {}
            else:
                result_dict = result_data if isinstance(result_data, dict) else {}
            
            # Extract validation_errors from result
            if "validation_errors" in result_dict:
                validation_errors.extend(result_dict["validation_errors"])
            elif "errors" in result_dict:
                validation_errors.extend(result_dict["errors"])
        
        if not validation_errors:
            log.warning("No structured validation errors found to fix")
            return False
        
        log.info(f"Found {len(validation_errors)} validation errors to fix")
        
        # Determine which files need fixing
        for error in validation_errors:
            if isinstance(error, dict) and "path" in error:
                # The path format is like "data.layout.0" - we need the actual file
                # We'll use the first changed file that's a layout file
                for changed_file in state.changed_files:
                    if "layout" in changed_file:
                        affected_files.add(changed_file)
                        break
        
        if not affected_files:
            # Default to first changed file
            affected_files.add(state.changed_files[0])
        
        # Generate fix patch using LLM
        fix_patch = await _generate_fix_patch(
            state.repo_path,
            list(affected_files),
            validation_errors,
            state
        )
        
        if not fix_patch or not fix_patch.get("changes"):
            log.warning("Failed to generate fix patch")
            return False
        
        # Apply the fix patch
        from agents.services.git import git_ops
        
        log.info(f"Applying auto-fix patch with {len(fix_patch['changes'])} changes")
        git_ops.apply(fix_patch, state.repo_path)
        
        return True
        
    except Exception as e:
        log.error(f"Auto-fix failed: {e}", exc_info=True)
        return False


async def _generate_fix_patch(
    repo_path: str,
    affected_files: list[str],
    validation_errors: list,
    state: AgentState
) -> Dict[str, Any]:
    """
    Generate a fix patch for validation errors using LLM.
    
    Args:
        repo_path: Path to repository
        affected_files: List of files with validation errors
        validation_errors: Structured validation errors
        state: Current agent state
        
    Returns:
        Patch data dictionary with fix changes
    """
    try:
        # Read current file contents
        file_contents = {}
        for file_path in affected_files:
            full_path = Path(repo_path) / file_path
            if full_path.exists():
                with open(full_path, 'r', encoding='utf-8') as f:
                    file_contents[file_path] = f.read()
        
        # Format validation errors for LLM
        errors_summary = []
        for error in validation_errors:
            if isinstance(error, dict):
                path = error.get("path", "unknown")
                message = error.get("message", str(error))
                errors_summary.append(f"- Path: {path}, Error: {message}")
            else:
                errors_summary.append(f"- {str(error)}")
        
        client = LLMClient(role="validator_fixer")
        
        system_prompt = get_prompt_content("verifier_error_fixer")
        user_prompt = render_template(
            "verifier_error_fix_user",
            errors_summary=chr(10).join(errors_summary),
            file_contents=json.dumps(file_contents, indent=2)
        )
        
        response = client.call_sync(system_prompt, user_prompt)
        
        # Parse JSON response
        clean = response.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        
        patch_data = json.loads(clean)
        
        log.info(f"Generated fix patch with {len(patch_data.get('changes', []))} changes")
        return patch_data
        
    except Exception as e:
        log.error(f"Failed to generate fix patch: {e}", exc_info=True)
        return {}
