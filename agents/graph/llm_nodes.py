"""LangGraph nodes that use LLMs directly"""
import json
from pathlib import Path
from typing import Dict, Any
from .state import AgentState
from agents.services import repo, verify, git_ops
from agents.services.llm_client import get_llm_client
from agents.services.events import AgentEvent
from agents.services.jobs import sink
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

def load_system_prompt(prompt_name: str) -> str:
    """Load system prompt from JSON file"""
    prompt_path = Path(__file__).parent.parent / "system_prompts" / f"{prompt_name}.json"
    try:
        with open(prompt_path, 'r') as f:
            prompt_data = json.load(f)
            return prompt_data.get("content", "")
    except Exception as e:
        log.error(f"Failed to load prompt {prompt_name}: {e}")
        return ""

def intake_llm(state: AgentState) -> AgentState:
    """Scan repository and create initial plan using LLM"""
    try:
        # Scan repository for facts
        facts = repo.scan(state.repo_path)

        # Load system prompt
        system_prompt = load_system_prompt("system_prompt")

        # Create user prompt with goal and facts
        user_prompt = f"""GOAL: {state.user_goal}

REPOSITORY FACTS:
{json.dumps(facts, indent=2)}

Based on this goal and repository structure, what should be done? Provide a brief assessment and initial plan."""

        # Call LLM
        client = get_llm_client()
        response = client.call_sync(system_prompt, user_prompt)

        # Store the response as initial plan
        state.step_plan = [response.strip()]
        state.next_action = "plan"

        # Emit plan proposed event
        sink.send(AgentEvent(
            type="plan_proposed",
            session_id=state.session_id,
            data={"plan": response.strip(), "step": response.strip()}  # Include both for compatibility
        ))

    except Exception as e:
        log.error(f"Intake failed: {e}")
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Intake failed: {str(e)}"}
        ))
        state.next_action = "stop"

    return state

def planner_llm(state: AgentState) -> AgentState:
    """Generate atomic step plan using LLM"""
    try:
        if not state.step_plan:
            raise Exception("No initial assessment from intake")

        # Load planner prompt
        planner_prompt = load_system_prompt("planner_prompt")

        # Get repository facts
        facts = repo.scan(state.repo_path)

        user_prompt = f"""USER GOAL: {state.user_goal}

INITIAL ASSESSMENT: {state.step_plan[0]}

REPOSITORY FACTS:
{json.dumps(facts, indent=2)}

Create a single atomic step that can be executed and verified in isolation. Return JSON with:
{{
  "action": "brief action description",
  "summary": "what this step accomplishes",
  "target_files": ["list", "of", "files", "to", "modify"],
  "operations": "detailed operations to perform",
  "expected_checks": "what verification should pass",
  "success_signals": "how to know it worked",
  "risks": "potential issues",
  "rollback": "how to undo if needed"
}}"""

        client = get_llm_client()
        response = client.call_sync(planner_prompt, user_prompt)

        try:
            plan_data = json.loads(response)
            # Store the structured plan
            state.step_plan = [plan_data.get("summary", response)]
            state.next_action = "act"
        except json.JSONDecodeError:
            # If not JSON, treat as plain text plan
            state.step_plan = [response.strip()]
            state.next_action = "act"

    except Exception as e:
        log.error(f"Planning failed: {e}")
        state.next_action = "stop"
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Planning failed: {str(e)}"}
        ))

    return state

async def actor_llm(state: AgentState) -> AgentState:
    """Create and apply patch using agentic MCP workflow"""
    try:
        if not state.step_plan:
            raise Exception("No step plan available")

        # Use the refactored agentic MCP workflow
        from agents.services.mcp_client import get_mcp_client

        step = state.step_plan[0]
        log.info(f"Using agentic MCP workflow for step: {step}")

        # Get MCP client instance and run patch creation
        mcp_client = get_mcp_client()
        patch = await mcp_client.create_patch_async(task_context=step, repository_path=state.repo_path)

        log.info(f"Agentic MCP workflow completed: {patch.get('summary', 'No summary')}")

        # Enforce safety caps
        try:
            git_ops.enforce_caps(patch, state.limits)
        except Exception as cap_err:
            import traceback
            traceback.print_exc()
            raise

        # Preview the patch
        preview = git_ops.preview(patch)
        
        # Emit patch preview - ensure all data is serializable
        try:
            event_data = {
                "files": list(preview["files"]) if isinstance(preview["files"], set) else preview["files"],
                "diff": str(preview["diff_preview"]),
                "file_count": int(preview["file_count"])
            }
            
            sink.send(AgentEvent(
                type="patch_preview",
                session_id=state.session_id,
                data=event_data
            ))
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise

        # Apply the patch to files in target repository
        git_ops.apply(patch, state.repo_path)
        log.info(f"Patch applied to files in {state.repo_path}: {patch}")
        state.changed_files = preview["files"]
        state.next_action = "verify"

    except git_ops.CapsExceededError as e:
        sink.send(AgentEvent(
            type="blocked",
            session_id=state.session_id,
            data={"reason": str(e)}
        ))
        state.next_action = "stop"

    except Exception as e:
        log.error(f"Actor failed: {e}")
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Actor failed: {str(e)}"}
        ))
        state.next_action = "stop"

    return state

def verifier_llm(state: AgentState) -> AgentState:
    """Run verification checks and analyze results with LLM"""
    try:
        # Run verification checks
        results = verify.run_all(state.repo_path, state.changed_files)

        # Use LLM to analyze verification results
        verifier_prompt = load_system_prompt("verifier_prompt")

        user_prompt = f"""VERIFICATION RESULTS:
{json.dumps(results, indent=2)}

CHANGED FILES: {state.changed_files}

ORIGINAL GOAL: {state.user_goal}

Analyze these verification results. Are the changes safe to commit?

IMPORTANT GUIDELINES:
- If results.ok is TRUE, approve the commit (safe_to_commit: true)
- Missing validation for C#/XSD files is NORMAL and ACCEPTABLE
- Only reject if there are ACTUAL VALIDATION FAILURES (results.ok is false)
- C# and XSD files don't need automated validation - they're reviewed manually
- DO NOT reject commits just because some files lack validation

Return JSON:
{{
  "safe_to_commit": true|false,
  "analysis": "detailed analysis of results",
  "concerns": ["list", "of", "any", "concerns"],
  "recommendations": "what should happen next"
}}"""

        client = get_llm_client()
        response = client.call_sync(verifier_prompt, user_prompt)

        try:
            analysis = json.loads(response)
            tests_passed = analysis.get("safe_to_commit", results["ok"])
            analysis_notes = analysis.get("analysis", "LLM analysis failed")
        except json.JSONDecodeError:
            tests_passed = results["ok"]
            analysis_notes = response

        state.tests_passed = tests_passed
        state.verify_notes = results["notes"] + [analysis_notes]
        state.next_action = "review"

        # Emit verification result
        sink.send(AgentEvent(
            type="verify_result",
            session_id=state.session_id,
            data={
                "ok": tests_passed,
                "success": tests_passed,  # Frontend expects this
                "notes": state.verify_notes,
                "analysis": analysis_notes,
                "message": analysis_notes  # Frontend expects this
            }
        ))

    except Exception as e:
        log.error(f"Verifier failed: {e}")
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Verifier failed: {str(e)}"}
        ))
        state.next_action = "stop"

    return state

def reviewer_llm(state: AgentState) -> AgentState:
    """Review results and commit or revert using LLM guidance"""
    try:
        # Use LLM to make final review decision
        reviewer_prompt = load_system_prompt("reviewer_prompt")

        user_prompt = f"""FINAL REVIEW:

ORIGINAL GOAL: {state.user_goal}
IMPLEMENTED STEP: {state.step_plan[0] if state.step_plan else "No plan"}
CHANGED FILES: {state.changed_files}
TESTS PASSED: {state.tests_passed}
VERIFICATION NOTES: {state.verify_notes}

Should these changes be committed or reverted? Return JSON:
{{
  "decision": "commit|revert",
  "commit_message": "appropriate commit message if committing",
  "reasoning": "explanation of decision"
}}"""

        client = get_llm_client()
        response = client.call_sync(reviewer_prompt, user_prompt)

        try:
            decision_data = json.loads(response)
            decision = decision_data.get("decision", "revert")
            commit_message = decision_data.get("commit_message", "Altinity automated change")
            reasoning = decision_data.get("reasoning", "LLM decision")
        except json.JSONDecodeError:
            # Fallback to simple logic
            decision = "commit" if state.tests_passed else "revert"
            commit_message = "Altinity automated change"
            reasoning = response
        
        if decision == "commit" and state.tests_passed:
            # Commit the changes in target repository (but never push)
            commit_hash = git_ops.commit(commit_message, state.repo_path)
            sink.send(AgentEvent(
                type="commit_done",
                session_id=state.session_id,
                data={
                    "branch": f"altinity_feature_{commit_hash[:8]}",
                    "commit": commit_hash,
                    "reasoning": f"{reasoning} (local only - never pushed)",
                    "repo_path": state.repo_path
                }
            ))
        else:
            # Revert the changes in target repository
            git_ops.revert(state.repo_path)
            sink.send(AgentEvent(
                type="reverted",
                session_id=state.session_id,
                data={
                    "reason": f"Decision: {decision}. {reasoning}",
                    "repo_path": state.repo_path
                }
            ))

        state.next_action = "stop"

    except Exception as e:
        log.error(f"Reviewer failed: {e}")
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Reviewer failed: {str(e)}"}
        ))
        state.next_action = "stop"

    return state