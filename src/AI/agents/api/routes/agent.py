"""Agent workflow API routes"""
import re
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from agents.graph.state import AgentState
from agents.graph.runner import run_in_background
from agents.services.events import permission_broker, sink

from agents.services.git.repo_manager import get_repo_manager
from api.dependencies import get_designer_api_key
from api.rate_limiting import RateLimiter
from shared.config import get_config
from shared.utils.logging_utils import get_logger
from shared.utils.path_utils import app_name_from_repo_url
from pathlib import Path
from typing import Optional, List
from shared.models import AttachmentUpload, AgentAttachment
from shared.models.attachments import get_session_dir, cleanup_session_attachments
from shared.models.experiment import ExperimentContext

router = APIRouter()
log = get_logger(__name__)
config = get_config()

PER_DEVELOPER_LIMIT = 5
ALL_DEVELOPERS_LIMIT = 30
_SESSION_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")

def _require_developer(request: Request) -> str:
    developer = request.headers.get("X-Developer")
    if not developer:
        raise HTTPException(status_code=400, detail="Missing X-Developer header")
    return developer


rate_limit_start_all_developers = RateLimiter(ALL_DEVELOPERS_LIMIT, "all-developers")
rate_limit_start_developer = RateLimiter(PER_DEVELOPER_LIMIT, _require_developer)


class StartReq(BaseModel):
    session_id: str
    goal: str
    repo_url: str  # Git repository URL to clone
    branch: Optional[str] = None  # Optional branch to checkout (for continuing work)
    # Fail closed: write access is opt-in. A caller that omits the flag
    # gets a read-only (chat mode) session, never silent write access.
    allow_app_changes: bool = False
    org: str
    attachments: List[AttachmentUpload] = Field(default_factory=list)
    experiment: Optional[ExperimentContext] = None

    @field_validator("session_id")
    @classmethod
    def _validate_session_id(cls, v: str) -> str:
        if not _SESSION_ID_PATTERN.match(v):
            raise ValueError("session_id must be 1-128 alphanumeric, hyphen, or underscore characters")
        return v

@router.post(
    "/api/agent/start",
    dependencies=[Depends(rate_limit_start_all_developers), Depends(rate_limit_start_developer)],
)
async def start_agent(
    req: StartReq,
    request: Request,
    designer_api_key: str = Depends(get_designer_api_key),
):
    """Start an agent workflow for a single atomic change"""
    try:
        session_id = req.session_id

        # Extract headers passed by Designer backend
        developer = _require_developer(request)

        sink.register_developer_session(developer, req.session_id)
        log.info(f"🔗 Pre-registered session {req.session_id} -> developer {developer}")

        app_name = app_name_from_repo_url(req.repo_url)

        # Clone the repository for this session
        repo_manager = get_repo_manager()
        repo_path = repo_manager.clone_repo_for_session(req.repo_url, session_id, req.branch, api_key=designer_api_key)

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

        # Unified path: chat vs workflow is a permission on the same agentic
        # loop, not a separate pipeline.  allow_app_changes=False runs the
        # loop read-only (write tools denied) — the model can still scan and
        # read the repo, load skills, and fetch docs to answer questions.
        log.info(
            f"{'🔧 Write' if req.allow_app_changes else '💬 Read-only'} mode "
            f"enabled for session {req.session_id}"
        )

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
            app_name=app_name,
            developer=developer,
            org=req.org,
            allow_app_changes=req.allow_app_changes,
            attachments=saved_attachments,
            designer_api_key=designer_api_key,
            conversation_history=conversation_history,
            experiment=req.experiment,
        )

        sink.add_to_conversation_history(req.session_id, "user", req.goal)

        sink.mark_session_started(req.session_id)
        run_in_background(state, sink)

        log.info(f"Started agent session {req.session_id}, goal: {req.goal}")

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


class PermissionResponseReq(BaseModel):
    request_id: str
    granted: bool


@router.post("/api/agent/permission/{session_id}")
async def respond_to_permission(session_id: str, req: PermissionResponseReq, request: Request):
    """Deliver the user's answer to an in-flight permission request.

    Emitted as a `permission_request` event when a read-only session's
    model attempts a write; the loop is blocked awaiting this answer.
    """
    caller = _require_developer(request)
    owner = sink.get_session_developer(session_id)
    if caller != owner:
        raise HTTPException(status_code=403, detail="Not the session owner")

    resolved = permission_broker.resolve(session_id, req.request_id, req.granted)
    if not resolved:
        raise HTTPException(status_code=404, detail="No matching permission request")
    return {"session_id": session_id, "granted": req.granted}


@router.post("/api/agent/cancel/{session_id}")
async def cancel_session(session_id: str, request: Request):
    """Cancel a running session. Sends a terminal event so the frontend stops loading."""
    status = sink.get_session_status(session_id)

    if status is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Enforce ownership: only the developer who started the session may cancel it
    caller = _require_developer(request)
    owner = sink.get_session_developer(session_id)
    if caller != owner:
        raise HTTPException(status_code=403, detail="Not the session owner")

    current_status = status.get("status")
    if current_status in ("done", "cancelled", "error"):
        return {"session_id": session_id, "status": current_status, "message": "Session already finished"}

    sink.cancel_session(session_id)
    # Wake a run blocked on a permission prompt — it must observe the
    # cancellation now, not after the prompt timeout.
    permission_broker.cancel_pending(session_id)
    log.info(f"🛑 Session {session_id} cancelled via API")
    return {"session_id": session_id, "status": "cancelled", "message": "Session cancelled"}


@router.get("/api/agent/status/{session_id}")
async def get_session_status(session_id: str):
    """Get the status of a session. Used by frontend to check if job completed while disconnected."""
    status = sink.get_session_status(session_id)
    if status is None:
        return {"session_id": session_id, "status": "unknown"}
    return {"session_id": session_id, **status}