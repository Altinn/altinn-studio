"""LangGraph nodes for agent workflow"""
from .state import AgentState
from agents.services import repo, verify, git_ops, mcp_client
from agents.services.events import AgentEvent
from agents.services.jobs import sink

def intake(state: AgentState) -> AgentState:
    """Scan repository and create initial plan"""
    try:
        facts = repo.scan(state.repo_path)
        state.step_plan = mcp_client.plan_atomic_step(state.user_goal, facts)
        state.next_action = "plan"

        # Emit plan proposed event
        sink.send(AgentEvent(
            type="plan_proposed",
            session_id=state.session_id,
            data={"step": state.step_plan[0] if state.step_plan else "No plan generated"}
        ))

    except Exception as e:
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Intake failed: {str(e)}"}
        ))
        state.next_action = "stop"

    return state

def planner(state: AgentState) -> AgentState:
    """Limit to one atomic step for MVP"""
    if state.step_plan:
        state.step_plan = state.step_plan[:1]  # Only keep first step
        state.next_action = "act"
    else:
        state.next_action = "stop"
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": "No plan available"}
        ))

    return state

def actor(state: AgentState) -> AgentState:
    """Create and apply patch with safety checks"""
    try:
        if not state.step_plan:
            raise Exception("No step plan available")

        # Generate patch
        patch = mcp_client.create_patch(state.repo_path, state.step_plan[0])

        # Enforce safety caps
        git_ops.enforce_caps(patch, state.limits)

        # Preview the patch
        preview = git_ops.preview(patch)

        # Emit patch preview
        sink.send(AgentEvent(
            type="patch_preview",
            session_id=state.session_id,
            data={
                "files": preview["files"],
                "diff": preview["diff_preview"],
                "file_count": preview["file_count"]
            }
        ))

        # Apply the patch
        git_ops.apply(patch)
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
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Actor failed: {str(e)}"}
        ))
        state.next_action = "stop"

    return state

def verifier(state: AgentState) -> AgentState:
    """Run verification checks on changed files"""
    try:
        results = verify.run_all(state.repo_path, state.changed_files)
        state.tests_passed = results["ok"]
        state.verify_notes = results["notes"]
        state.next_action = "review"

        # Emit verification result
        sink.send(AgentEvent(
            type="verify_result",
            session_id=state.session_id,
            data={
                "ok": results["ok"],
                "notes": results["notes"]
            }
        ))

    except Exception as e:
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Verifier failed: {str(e)}"}
        ))
        state.next_action = "stop"

    return state

def reviewer(state: AgentState) -> AgentState:
    """Commit if tests pass, revert if they fail"""
    try:
        if state.tests_passed:
            # Commit the changes
            commit_hash = git_ops.commit("altinity feature change")
            sink.send(AgentEvent(
                type="commit_done",
                session_id=state.session_id,
                data={
                    "branch": f"altinity_feature_{commit_hash}",
                    "commit": commit_hash
                }
            ))
        else:
            # Revert the changes
            git_ops.revert()
            sink.send(AgentEvent(
                type="reverted",
                session_id=state.session_id,
                data={"reason": "verification failed"}
            ))

        state.next_action = "stop"

    except Exception as e:
        sink.send(AgentEvent(
            type="error",
            session_id=state.session_id,
            data={"message": f"Reviewer failed: {str(e)}"}
        ))
        state.next_action = "stop"

    return state