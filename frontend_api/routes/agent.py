"""Agent workflow API routes"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from agents.graph.state import AgentState
from agents.graph.runner import run_in_background
from agents.services.events import sink
from agents.services.llm import parse_intent_async, ParsedIntent, IntentParsingError, suggest_goal_correction
from agents.services.git.repo_manager import get_repo_manager
from shared.config import get_config
from shared.utils.logging_utils import get_logger
from pathlib import Path
from typing import Optional, List
from shared.models import AttachmentUpload, AgentAttachment
from shared.models.attachments import get_session_dir, cleanup_session_attachments

router = APIRouter()
log = get_logger(__name__)
config = get_config()

# State persistence
APP_STATE_FILE = Path(__file__).parent.parent / "app_state.json"

class StartReq(BaseModel):
    session_id: str
    goal: str
    repo_url: str  # Git repository URL to clone
    branch: Optional[str] = None  # Optional branch to checkout (for continuing work)
    attachments: List[AttachmentUpload] = Field(default_factory=list)

@router.post("/api/agent/start")
async def start_agent(req: StartReq):
    """Start an agent workflow for a single atomic change"""
    try:
        # Clone the repository for this session
        repo_manager = get_repo_manager()
        repo_path = repo_manager.clone_repo_for_session(req.repo_url, req.session_id, req.branch)

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
                raise HTTPException(status_code=400, detail=f"Invalid attachment payload: {e}")

        # Parse intent with safety validation
        parsed_intent = await parse_intent_async(req.goal, attachments=saved_attachments)

        if not parsed_intent.safe:
            log.warning(f"Unsafe goal rejected for session {req.session_id}: {parsed_intent.reason}")
            suggestions = suggest_goal_correction(req.goal)

            error_detail = {
                "message": f"Goal rejected: {parsed_intent.reason}",
                "suggestions": suggestions
            }
            raise HTTPException(status_code=400, detail=error_detail)

        if parsed_intent.confidence < 0.1:
            log.warning(f"Low confidence goal rejected for session {req.session_id}: {parsed_intent.confidence}")
            suggestions = suggest_goal_correction(req.goal)

            error_detail = {
                "message": "Goal is too unclear or ambiguous",
                "suggestions": suggestions
            }
            raise HTTPException(status_code=400, detail=error_detail)
        log.info(f"Parsed intent for session {req.session_id}: action={parsed_intent.action}, component={parsed_intent.component}, confidence={parsed_intent.confidence}")

        # Create initial state
        state = AgentState(
            session_id=req.session_id,
            user_goal=req.goal,
            repo_path=str(repo_path),  # Use cloned repo path
            attachments=saved_attachments
        )

        # Start workflow in background
        run_in_background(state, sink)

        log.info(f"Started agent workflow for session {req.session_id}, goal: {req.goal}")

        return {
            "accepted": True,
            "session_id": req.session_id,
            "message": "Agent workflow started",
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
            "parsed_intent": {
                "action": parsed_intent.action,
                "component": parsed_intent.component,
                "target": parsed_intent.target,
                "confidence": parsed_intent.confidence,
                "details": parsed_intent.details
            }
        }

    except Exception as e:
        log.error(f"Failed to start agent workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))