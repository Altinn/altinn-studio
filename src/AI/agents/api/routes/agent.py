"""Agent workflow API routes"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from agents.graph.state import AgentState
from agents.graph.runner import run_in_background
from agents.graph.nodes import assistant
from agents.services.events import sink, AgentEvent
from agents.services.llm import parse_intent_async, ParsedIntent, IntentParsingError, suggest_goal_correction
from agents.services.git.repo_manager import get_repo_manager
from api.dependencies import get_user_token
from shared.config import get_config
from shared.utils.logging_utils import get_logger
from pathlib import Path
from typing import Optional, List
from shared.models import AttachmentUpload, AgentAttachment
from shared.models.attachments import get_session_dir, cleanup_session_attachments

router = APIRouter()
log = get_logger(__name__)
config = get_config()


class StartReq(BaseModel):
    goal: str
    repo_url: str  # Git repository URL to clone
    branch: Optional[str] = None  # Optional branch to checkout (for continuing work)
    allow_app_changes: bool = True  # If False, run in chat-only mode (no modifications)
    attachments: List[AttachmentUpload] = Field(default_factory=list)

@router.post("/api/agent/start")
async def start_agent(
    req: StartReq,
    gitea_token: str = Depends(get_user_token),
    x_session_id: str = Header(..., alias="X-Session-Id")
):
    """Start an agent workflow for a single atomic change"""
    try:
        session_id = x_session_id
        log.info(f"Starting agent workflow for session {session_id}")

        # Clone the repository for this session
        repo_manager = get_repo_manager()
        repo_path = repo_manager.clone_repo_for_session(req.repo_url, session_id, req.branch, gitea_token)

        branch_info = f" on branch {req.branch}" if req.branch else ""
        log.info(f"Cloned repository {req.repo_url} to {repo_path} for session {session_id}{branch_info}")

        # Validate repo path exists and is an Altinn app
        repo = Path(repo_path)
        if not repo.exists():
            raise HTTPException(status_code=400, detail=f"Failed to clone repository: {repo_path}")

        if not repo.is_dir():
            raise HTTPException(status_code=400, detail=f"Repository path is not a directory: {repo_path}")

        # Check if it looks like an Altinn app
        if not (repo / "App").exists():
            log.warning(f"Repository {repo_path} does not appear to be an Altinn app (missing App/ directory)")

        saved_attachments: List[AgentAttachment] = []
        if req.attachments:
            try:
                cleanup_session_attachments(config.ATTACHMENTS_ROOT, session_id)
                attachment_dir = get_session_dir(config.ATTACHMENTS_ROOT, session_id)
                for upload in req.attachments:
                    saved_attachments.append(upload.to_agent_attachment(attachment_dir))
                log.info(f"Stored {len(saved_attachments)} attachments for session {session_id}")
            except Exception as e:
                log.error(f"Failed to process attachments for session {session_id}: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid attachment payload: {e}")

        # Route based on allow_app_changes flag
        if not req.allow_app_changes:
            # Chat mode - skip intent validation for questions
            log.info(f"💬 Chat mode: skipping intent validation for Q&A")
            # Chat mode - answer questions without making changes
            log.info(f"💬 Chat mode enabled for session {session_id}")

            # Run chat query in background so API returns immediately
            # This allows frontend to subscribe to events before they're sent
            async def _run_chat():
                # Send starting event
                sink.send(AgentEvent(
                    type="status",
                    session_id=session_id,
                    data={
                        "message": "Chat mode: I'll help answer your questions without making changes.",
                        "mode": "chat"
                    }
                ))
                
                try:
                    # Create state for assistant node
                    state = AgentState(
                        session_id=session_id,
                        user_goal=req.goal,
                        repo_path=str(repo_path),
                        gitea_token=gitea_token,
                        attachments=saved_attachments
                    )

                    # Run assistant node
                    result_state = await assistant(state)

                    # Send completion event - include mode so frontend knows not to do branch operations
                    sink.send(AgentEvent(
                        type="status",
                        session_id=session_id,
                        data={
                            "message": "Chat query completed",
                            "status": "completed",
                            "mode": "chat",
                            "no_branch_operations": True  # Explicit flag for frontend
                        }
                    ))
                    
                    log.info(f"✅ Chat query completed for session {session_id}")

                except Exception as chat_error:
                    log.error(f"Chat query failed for session {session_id}: {chat_error}")
                    sink.send(AgentEvent(
                        type="error",
                        session_id=session_id,
                        data={
                            "message": f"Chat query failed: {str(chat_error)}",
                            "mode": "chat"
                        }
                    ))
            
            # Mark session as started and create background task - API returns immediately
            import asyncio
            sink.mark_session_started(session_id)
            asyncio.create_task(_run_chat())
        else:
            # Normal workflow mode - make changes
            log.info(f"🔧 Workflow mode enabled for session {session_id}")

            # Parse intent with safety validation (only for workflow mode)
            parsed_intent = await parse_intent_async(req.goal, attachments=saved_attachments)

            if not parsed_intent.safe:
                log.warning(f"Unsafe goal rejected for session {session_id}: {parsed_intent.reason}")
                suggestions = suggest_goal_correction(req.goal)

                error_detail = {
                    "message": f"Goal rejected: {parsed_intent.reason}",
                    "suggestions": suggestions
                }
                raise HTTPException(status_code=400, detail=error_detail)

            if parsed_intent.confidence < 0.1:
                log.warning(f"Low confidence goal rejected for session {session_id}: {parsed_intent.confidence}")
                suggestions = suggest_goal_correction(req.goal)

                error_detail = {
                    "message": "Goal is too unclear or ambiguous",
                    "suggestions": suggestions
                }
                raise HTTPException(status_code=400, detail=error_detail)

            log.info(f"Parsed intent for session {session_id}: action={parsed_intent.action}, component={parsed_intent.component}, confidence={parsed_intent.confidence}")

            # Create initial state
            state = AgentState(
                session_id=session_id,
                user_goal=req.goal,
                repo_path=str(repo_path),  # Use cloned repo path
                gitea_token=gitea_token,  # Pass token to workflow for MCP
                attachments=saved_attachments
            )

            # Mark session as started and start workflow in background
            sink.mark_session_started(session_id)
            run_in_background(state, sink)

            log.info(f"Started agent workflow for session {session_id}, goal: {req.goal}")
            
            # Set parsed_intent for response
            parsed_intent_data = {
                "action": parsed_intent.action,
                "component": parsed_intent.component,
                "target": parsed_intent.target,
                "confidence": parsed_intent.confidence,
                "details": parsed_intent.details
            }

        mode = "chat" if not req.allow_app_changes else "workflow"

        response_data = {
            "accepted": True,
            "session_id": session_id,
            "mode": mode,
            "message": f"Agent started in {mode} mode",
            "repo_url": req.repo_url,
            "branch": req.branch,
            "repo_path": str(repo_path),
            "attachments": [
                {
                    "name": att.name,
                    "mime_type": att.mime_type,
                    "size": att.size,
                }
                for att in saved_attachments
            ]
        }
        
        # Only include parsed_intent for workflow mode
        if mode == "workflow" and 'parsed_intent_data' in locals():
            response_data["parsed_intent"] = parsed_intent_data
        
        return response_data

    except Exception as e:
        log.error(f"Failed to start agent workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/agent/status/{session_id}")
async def get_session_status(session_id: str):
    """Get the status of a session. Used by frontend to check if job completed while disconnected."""
    status = sink.get_session_status(session_id)
    if status is None:
        return {"session_id": session_id, "status": "unknown"}
    return {"session_id": session_id, **status}