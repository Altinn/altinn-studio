"""Agent workflow API routes"""
import re
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from agents.graph.state import AgentState
from agents.graph.runner import run_in_background
from agents.graph.nodes import assistant
from agents.services.events import sink, AgentEvent

from agents.services.git.repo_manager import get_repo_manager
from api.dependencies import get_designer_api_key
from shared.config import get_config
from shared.utils.logging_utils import get_logger
from pathlib import Path
from typing import Optional, List
from shared.models import AttachmentUpload, AgentAttachment
from shared.models.attachments import get_session_dir, cleanup_session_attachments

router = APIRouter()
log = get_logger(__name__)
config = get_config()

_active_tasks: set = set()


_SESSION_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")


class StartReq(BaseModel):
    session_id: str
    goal: str
    repo_url: str  # Git repository URL to clone
    branch: Optional[str] = None  # Optional branch to checkout (for continuing work)
    allow_app_changes: bool = True  # If False, run in chat-only mode (no modifications)
    attachments: List[AttachmentUpload] = Field(default_factory=list)

    @field_validator("session_id")
    @classmethod
    def _validate_session_id(cls, v: str) -> str:
        if not _SESSION_ID_PATTERN.match(v):
            raise ValueError("session_id must be 1-128 alphanumeric, hyphen, or underscore characters")
        return v

@router.post("/api/agent/start")
async def start_agent(
    req: StartReq,
    request: Request,
    designer_api_key: str = Depends(get_designer_api_key),
):
    """Start an agent workflow for a single atomic change"""
    try:
        session_id = req.session_id

        # Extract headers passed by Designer backend
        developer = request.headers.get("X-Developer")
        if developer:
            sink.register_developer_session(developer, req.session_id)
            log.info(f"🔗 Pre-registered session {req.session_id} -> developer {developer}")
        
        # Clone the repository for this session
        repo_manager = get_repo_manager()
        repo_path = repo_manager.clone_repo_for_session(req.repo_url, session_id, req.branch, developer=developer)

        branch_info = f" on branch {req.branch}" if req.branch else ""
        log.info(f"Cloned repository {req.repo_url} to {repo_path} for session {req.session_id}{branch_info}")

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
                cleanup_session_attachments(config.ATTACHMENTS_ROOT, req.session_id)
                attachment_dir = get_session_dir(config.ATTACHMENTS_ROOT, req.session_id)
                for upload in req.attachments:
                    saved_attachments.append(upload.to_agent_attachment(attachment_dir))
                log.info(f"Stored {len(saved_attachments)} attachments for session {req.session_id}")
            except Exception as e:
                log.error(f"Failed to process attachments for session {req.session_id}: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid attachment payload: {e}") from e

        # Route based on allow_app_changes flag
        if not req.allow_app_changes:
            # Chat mode - skip intent validation for questions
            log.info("💬 Chat mode: skipping intent validation for Q&A")
            # Chat mode - answer questions without making changes
            log.info(f"💬 Chat mode enabled for session {req.session_id}")
            
            # Run chat query in background so API returns immediately
            # This allows frontend to subscribe to events before they're sent
            async def _run_chat():
                from shared.utils.langfuse_utils import init_langfuse, is_langfuse_enabled
                from langfuse import get_client as get_langfuse_client

                init_langfuse()
                langfuse = get_langfuse_client() if is_langfuse_enabled() else None

                async def _run_chat_inner():
                    sink.send(AgentEvent(
                        type="status",
                        session_id=req.session_id,
                        data={
                            "message": "Tenker...",
                            "mode": "chat"
                        }
                    ))

                    try:
                        from agents.graph.state import ConversationMessage
                        stored_history = sink.get_conversation_history(req.session_id)
                        conversation_history = [
                            ConversationMessage(role=msg["role"], content=msg["content"], sources=msg.get("sources"))
                            for msg in stored_history
                        ]

                        sink.add_to_conversation_history(req.session_id, "user", req.goal)

                        state = AgentState(
                            session_id=req.session_id,
                            user_goal=req.goal,
                            repo_path=str(repo_path),
                            attachments=saved_attachments,
                            conversation_history=conversation_history,
                        )

                        result_state = await assistant(state)

                        if (result_state.assistant_response or {}).get("cancelled"):
                            log.info(f"🛑 Chat query cancelled for session {req.session_id}, skipping completion event")
                            return result_state

                        reply = (result_state.assistant_response or {}).get("response", "")
                        cited_sources = (result_state.assistant_response or {}).get("sources")
                        if reply:
                            sink.add_to_conversation_history(
                                req.session_id, "assistant", reply, sources=cited_sources
                            )

                        sink.send(AgentEvent(
                            type="status",
                            session_id=req.session_id,
                            data={
                                "message": "Chat query completed",
                                "status": "completed",
                                "mode": "chat",
                                "no_branch_operations": True
                            }
                        ))

                        log.info(f"✅ Chat query completed for session {req.session_id}")
                        return result_state

                    except Exception as chat_error:
                        log.error(f"Chat query failed for session {req.session_id}: {chat_error}")
                        sink.send(AgentEvent(
                            type="error",
                            session_id=req.session_id,
                            data={
                                "message": f"Chat query failed: {str(chat_error)}",
                                "mode": "chat"
                            }
                        ))
                        return None

                try:
                    if langfuse:
                        history_for_trace = [
                            {"role": msg["role"], "content": msg["content"][:300]}
                            for msg in sink.get_conversation_history(req.session_id)
                        ]
                        with langfuse.start_as_current_observation(
                            as_type="span",
                            name="Altinity Assistant Query",
                            input={
                                "user_goal": str(req.goal)[:500],
                                "session_id": req.session_id,
                                "conversation_history": history_for_trace,
                            },
                            metadata={"span_type": "AGENT", "session_id": req.session_id},
                        ) as root_span:
                            result_state_ref = await _run_chat_inner()
                            if result_state_ref is not None:
                                reply = (result_state_ref.assistant_response or {}).get("response", "")
                                root_span.update(output={"response": reply[:1000] if reply else ""})
                    else:
                        await _run_chat_inner()
                except Exception as outer_error:
                    log.error(f"Unexpected error in chat task for session {req.session_id}: {outer_error}")
                    sink.send(AgentEvent(
                        type="error",
                        session_id=req.session_id,
                        data={"message": f"Chat query failed: {str(outer_error)}", "mode": "chat"}
                    ))
            
            # Mark session as started and create background task - API returns immediately
            import asyncio
            sink.mark_session_started(req.session_id)
            task = asyncio.create_task(_run_chat())
            _active_tasks.add(task)
            task.add_done_callback(_active_tasks.discard)
        else:
            # Normal workflow mode - make changes
            log.info(f"🔧 Workflow mode enabled for session {req.session_id}")
            
            # Load conversation history from previous interactions in this session
            from agents.graph.state import ConversationMessage
            stored_history = sink.get_conversation_history(req.session_id)
            conversation_history = [
                ConversationMessage(role=msg["role"], content=msg["content"], sources=msg.get("sources"))
                for msg in stored_history
            ]
            
            state = AgentState(
                session_id=req.session_id,
                user_goal=req.goal,
                repo_path=str(repo_path),
                attachments=saved_attachments,
                designer_api_key=designer_api_key,
                conversation_history=conversation_history
            )
            
            sink.add_to_conversation_history(req.session_id, "user", req.goal)

            # Intent validation + workflow run in background (single Langfuse trace)
            sink.mark_session_started(req.session_id)
            run_in_background(state, sink)

            log.info(f"Started agent workflow for session {req.session_id}, goal: {req.goal}")

        mode = "chat" if not req.allow_app_changes else "workflow"
        
        return {
            "accepted": True,
            "session_id": req.session_id,
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
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Failed to start agent workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/agent/cancel/{session_id}")
async def cancel_session(session_id: str, request: Request):
    """Cancel a running session. Sends a terminal event so the frontend stops loading."""
    status = sink.get_session_status(session_id)

    if status is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Enforce ownership: only the developer who started the session may cancel it
    caller = request.headers.get("X-Developer")
    owner = sink.get_session_developer(session_id)
    if owner and caller and caller != owner:
        raise HTTPException(status_code=403, detail="Not the session owner")

    current_status = status.get("status")
    if current_status in ("done", "cancelled", "error"):
        return {"session_id": session_id, "status": current_status, "message": "Session already finished"}

    sink.cancel_session(session_id)
    log.info(f"🛑 Session {session_id} cancelled via API")
    return {"session_id": session_id, "status": "cancelled", "message": "Session cancelled"}


@router.get("/api/agent/status/{session_id}")
async def get_session_status(session_id: str):
    """Get the status of a session. Used by frontend to check if job completed while disconnected."""
    status = sink.get_session_status(session_id)
    if status is None:
        return {"session_id": session_id, "status": "unknown"}
    return {"session_id": session_id, **status}