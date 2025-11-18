"""Reviewer workflow pipeline for validation fixes and commit decisions."""

from __future__ import annotations

import json
import os
import re
from typing import Dict, List, Optional, Any

from agents.services.llm import LLMClient
from agents.services.mcp import MCPVerifier, MCPVerificationResult
from agents.prompts import get_prompt_content, render_template
from agents.workflows.shared.utils import (
    cleanup_feature_branch,
    cleanup_generated_artifacts,
    scan_repository_directly,
)
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


def _extract_validation_errors(verification_result: MCPVerificationResult) -> List[str]:
    """Extract validation errors from verification result."""
    errors = []
    if not verification_result.passed:
        for error in verification_result.errors:
            errors.append(str(error))
    return errors


def _generate_llm_fix_prompt(
    error_messages: List[str], 
    repo_context: Dict[str, Any],
    changed_files: List[str]
) -> str:
    """Generate prompt for LLM to fix validation errors."""
    return f"""
    FIX VALIDATION ERRORS:
    
    ERRORS:
    {chr(10).join(error_messages)}
    
    REPOSITORY CONTEXT:
    {json.dumps(repo_context, indent=2)}
    
    CHANGED FILES:
    {chr(10).join(changed_files)}
    
    INSTRUCTIONS:
    1. Analyze the validation errors
    2. Propose specific fixes for each error
    3. Return a JSON object with 'fixes' array containing file paths and corrected content
    
    RESPONSE FORMAT:
    {{
        "fixes": [
            {{
                "file": "path/to/file",
                "content": "fixed file content"
            }}
        ]
    }}
    """.strip()


async def attempt_validation_fixes(
    repo_path: str,
    changed_files: List[str],
    plan_step: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Attempt to fix validation errors using MCP verification and LLM.
    
    Args:
        repo_path: Path to repository
        changed_files: List of changed files
        plan_step: Current plan step (optional)
        
    Returns:
        Dict with updated state after fix attempts
    """
    log.info("🤖 Attempting to fix validation errors...")
    
    # Initialize verifier
    verifier = MCPVerifier(repo_path)
    
    # Create patch for verification
    patch = {
        "changes": [{"file": f, "op": "modify"} for f in changed_files]
    }
    
    # Run verification
    try:
        result = await verifier.verify_with_tools(patch, plan_step or {})
        errors = _extract_validation_errors(result)
        
        if not errors:
            log.info("✅ No validation errors found after re-verification")
            return {
                "changed_files": changed_files,
                "tests_passed": True,
                "notes": ["All validation errors resolved"],
            }
            
        # Get repository context
        repo_context = scan_repository_directly(repo_path)
        
        # Generate fix prompt
        prompt = _generate_llm_fix_prompt(errors, repo_context, changed_files)
        
        # Call LLM for fixes
        llm = LLMClient(role="reviewer")
        response = await llm.call_async(
            system_prompt="You are an expert at fixing validation errors in Altinn Studio apps.",
            user_prompt=prompt,
        )
        
        # Parse and apply fixes
        try:
            if not response or not response.strip():
                log.warning("LLM returned empty response for validation fixes")
                raise ValueError("Empty LLM response")
                
            fixes = json.loads(response)["fixes"]
            for fix in fixes:
                file_path = os.path.join(repo_path, fix["file"])
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(fix["content"])
            
            # Re-verify after fixes
            result = await verifier.verify_with_tools(patch, plan_step or {})
            
            return {
                "changed_files": changed_files,
                "tests_passed": result.passed,
                "notes": [f"Fixed {len(fixes)} validation errors"] + _extract_validation_errors(result),
            }
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            log.warning(f"LLM fix attempt failed (will revert): {e}")
            # Don't try to fix, just return failure so reviewer reverts
            return {
                "changed_files": changed_files,
                "tests_passed": False,
                "notes": [f"Unable to automatically fix validation errors: {e}"],
            }
            
    except Exception as e:
        log.error(f"Error during validation fix attempt: {e}", exc_info=True)
        return {
            "changed_files": changed_files,
            "tests_passed": False,
            "notes": [f"Error during validation fix attempt: {str(e)}"],
        }


def _parse_decision_response(response: str) -> Dict[str, Any]:
    """Parse the reviewer response, handling code fences and extra text."""
    try:
        return json.loads(response)
    except json.JSONDecodeError as primary_error:
        # Check for fenced code block
        code_block_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response, re.DOTALL)
        if code_block_match:
            block = code_block_match.group(1)
            try:
                return json.loads(block)
            except json.JSONDecodeError:
                pass

        # Attempt to extract first JSON object in the string
        start = response.find("{")
        end = response.rfind("}")
        if start != -1 and end != -1 and end > start:
            snippet = response[start:end + 1]
            try:
                return json.loads(snippet)
            except json.JSONDecodeError:
                pass

        raise primary_error


def reviewer_decision(
    user_goal: str,
    step_plan: Optional[List[str]],
    changed_files: List[str],
    tests_passed: bool,
    verify_notes: List[str],
) -> Dict[str, object]:
    """Call reviewer LLM to decide whether to commit or revert."""

    reviewer_prompt = get_prompt_content("reviewer_decision")

    plan_context = step_plan[0] if step_plan else "No plan"
    user_prompt = render_template(
        "reviewer_decision_user",
        user_goal=user_goal,
        plan_context=plan_context,
        changed_files=changed_files,
        tests_passed=tests_passed,
        verify_notes=verify_notes
    )

    client = LLMClient(role="reviewer")
    response = client.call_sync(reviewer_prompt, user_prompt)

    try:
        decision_data = _parse_decision_response(response)
        decision = decision_data.get("decision", "commit" if tests_passed else "revert")  # Default to commit if tests passed

        # Capture commit message and reasoning from LLM response
        commit_message = decision_data.get("commit_message", "").strip()
        reasoning = decision_data.get("reasoning", "LLM decision")

        # If the reviewer omitted a commit message entirely, fall back to the user goal
        if not commit_message:
            log.warning(
                "Reviewer LLM did not return a commit message. Falling back to user goal summary."
            )
            commit_message = f"{user_goal[:100]}" if user_goal else "Altinity automated change"

        # Final override: If tests passed and no validation issues, force commit
        validation_notes_lower = " ".join(verify_notes).lower() if verify_notes else ""
        has_validation_issues = any(word in validation_notes_lower for word in ["error", "failed", "issue", "problem", "warning"])
        
        if tests_passed and not has_validation_issues and decision == "revert":
            log.info("Overriding reviewer decision: tests passed with no validation issues, forcing commit")
            decision = "commit"
            reasoning = "Tests passed and no validation issues found - committing successful changes"

        log.info(f"Final reviewer decision: {decision}, commit_message: '{commit_message[:50]}...', reasoning: '{reasoning[:50]}...'")

    except json.JSONDecodeError:
        # Default to commit if tests passed, revert if failed
        decision = "commit" if tests_passed else "revert"
        fallback_message = user_goal[:100] if user_goal else "Altinity automated change"
        commit_message = fallback_message if tests_passed else "Altinity automated change"
        reasoning = f"JSON parsing failed, defaulting to {'commit' if tests_passed else 'revert'} based on test results"

    return {
        "decision": decision,
        "commit_message": commit_message,
        "reasoning": reasoning,
    }


def check_reviewer_preconditions(
    changed_files: List[str],
    tests_passed: bool,
) -> List[str]:
    """Check preconditions for reviewer workflow.

    Returns:
        List of failure reasons (empty if all preconditions pass)
    """
    failures = []

    # Must have changed files
    if not changed_files or len(changed_files) == 0:
        failures.append("No files were changed")

    # Must have passed verification
    if tests_passed is not True:
        failures.append(f"Verification failed: tests_passed={tests_passed}")

    return failures


async def execute_reviewer_workflow(
    repo_path: str,
    user_goal: str,
    step_plan: Optional[List[str]],
    changed_files: List[str],
    tests_passed: bool,
    verify_notes: List[str],
    session_id: str,
) -> Dict[str, Any]:
    """Execute the complete reviewer workflow including fixes, decision, and git operations.

    Args:
        repo_path: Path to the repository
        user_goal: Original user goal
        step_plan: List of plan steps
        changed_files: Files that were changed
        tests_passed: Whether verification passed
        verify_notes: Verification notes
        session_id: Session identifier

    Returns:
        Dict with workflow results
    """
    from agents.services.git import git_ops
    from agents.services.events import AgentEvent
    from agents.services.events import sink

    # Check preconditions
    precondition_failures = check_reviewer_preconditions(changed_files, tests_passed)

    # Attempt validation fixes if verification failed
    if not tests_passed:
        log.info("🤖 Reviewer attempting to fix validation errors...")
        
        # Log the specific validation errors
        log.warning(f"Validation errors to fix: {verify_notes}")

        fix_result = await attempt_validation_fixes(
            repo_path=repo_path,
            changed_files=changed_files,
            plan_step={"plan": step_plan[0] if step_plan else None}
        )

        # Update state with fix results
        changed_files = fix_result.get("changed_files", changed_files)
        tests_passed = fix_result.get("tests_passed", tests_passed)
        verify_notes = fix_result.get("notes", verify_notes)

        # Remove verification failure from precondition failures if now passed
        if tests_passed:
            precondition_failures = [f for f in precondition_failures
                                   if "Verification failed" not in f]

    # If preconditions still fail, revert
    if precondition_failures:
        log.warning(f"Reviewer preconditions failed: {precondition_failures}")

        # Clean up feature branch
        cleanup_feature_branch(repo_path)

        # Clean up artifacts
        cleanup_generated_artifacts(repo_path)

        # Revert changes
        git_ops.revert(repo_path)


        return {
            "decision": "revert",
            "reasoning": f"Precondition failures: {', '.join(precondition_failures)}",
            "tests_passed": tests_passed,
            "changed_files": changed_files,
        }

    # Make final decision
    decision_result = reviewer_decision(
        user_goal=user_goal,
        step_plan=step_plan,
        changed_files=changed_files,
        tests_passed=tests_passed,
        verify_notes=verify_notes,
    )

    decision = decision_result["decision"]
    commit_message = decision_result["commit_message"]
    reasoning = decision_result["reasoning"]

    if decision == "commit" and tests_passed and len(changed_files) > 0:
        try:
            # Stage changed files
            import subprocess
            for file_path in changed_files:
                subprocess.run(["git", "add", file_path], cwd=repo_path, check=True)

            # Commit changes
            # Extract a unique identifier from session_id (skip "session_" prefix if present)
            if session_id.startswith("session_"):
                unique_id = session_id[8:16]  # Take 8 chars after "session_"
            else:
                unique_id = session_id[:8]
            branch_name = f"altinity_session_{unique_id}"
            commit_hash = git_ops.commit(commit_message, repo_path, branch_name=branch_name)
            
            if commit_hash is None:
                log.warning("No changes to commit - all requested changes were already implemented")
                decision = "no_changes"
                commit_message = "All requested changes were already implemented - no new commit needed"
            else:
                # Push the branch to remote repository
                try:
                    from agents.services.git.repo_manager import get_repo_manager
                    repo_manager = get_repo_manager()
                    repo_manager.push_branch(session_id, branch_name)
                    log.info(f"Successfully pushed branch {branch_name} to remote")
                except Exception as push_error:
                    log.error(f"Failed to push branch {branch_name}: {push_error}")
                    # Don't revert on push failure - the commit is still valid
                    # Just log the error and continue


        except subprocess.CalledProcessError as e:
            log.error(f"Git staging failed: {e}")
            # Fall back to revert
            git_ops.revert(repo_path)
            decision = "revert"
    else:
        # Revert changes
        git_ops.revert(repo_path)

    # Clean up cloned repository after workflow completion
    try:
        from agents.services.git.repo_manager import get_repo_manager
        repo_manager = get_repo_manager()
        repo_manager.cleanup_session(session_id)
        log.info(f"Cleaned up repository for session {session_id}")
    except Exception as cleanup_error:
        log.error(f"Failed to cleanup repository for session {session_id}: {cleanup_error}")

    return {
        "decision": decision,
        "commit_message": commit_message,
        "reasoning": reasoning,
        "tests_passed": tests_passed,
        "changed_files": changed_files,
    }
