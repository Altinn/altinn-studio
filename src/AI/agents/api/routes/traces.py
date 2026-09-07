from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, field_validator

from services.traces import delete_expired_traces
from shared.utils.langfuse_utils import delete_score, get_trace_developer, score_validation
from shared.utils.logging_utils import get_logger

router = APIRouter(prefix="/api/traces")
log = get_logger(__name__)

DEVELOPER_HEADER = "X-Developer"
FEEDBACK_SCORE_NAME = "user_feedback"
FEEDBACK_COMMENT_MAX_LENGTH = 10000


class FeedbackReq(BaseModel):
    """User feedback (thumbs up/down) on an assistant message, recorded as a Langfuse score."""

    thumbs_up: bool
    comment: Optional[str] = None

    @field_validator("comment")
    @classmethod
    def _validate_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > FEEDBACK_COMMENT_MAX_LENGTH:
            raise ValueError(
                f"comment must not exceed {FEEDBACK_COMMENT_MAX_LENGTH} characters"
            )
        return v


@router.put("/{trace_id}/feedback", status_code=204)
async def submit_feedback(trace_id: str, req: FeedbackReq, request: Request):
    """Records user feedback as a Langfuse score on the given trace.

    A second PUT for the same trace overwrites the previous score.
    """
    _assert_caller_owns_trace(request, trace_id)

    score_validation(
        name=FEEDBACK_SCORE_NAME,
        passed=req.thumbs_up,
        trace_id=trace_id,
        comment=req.comment or "",
        score_id=_feedback_score_id(trace_id),
    )
    return Response(status_code=204)


@router.delete("/{trace_id}/feedback", status_code=204)
async def clear_feedback(trace_id: str, request: Request):
    """Removes the user's feedback score from the given trace."""
    _assert_caller_owns_trace(request, trace_id)
    delete_score(_feedback_score_id(trace_id))
    return Response(status_code=204)


def _feedback_score_id(trace_id: str) -> str:
    return f"{trace_id}:{FEEDBACK_SCORE_NAME}"


def _assert_caller_owns_trace(request: Request, trace_id: str) -> None:
    caller = request.headers.get(DEVELOPER_HEADER)
    if not caller:
        raise HTTPException(
            status_code=400, detail=f"Missing {DEVELOPER_HEADER} header"
        )
    if get_trace_developer(trace_id) != caller:
        raise HTTPException(status_code=403)


@router.post("/delete-expired")
async def clean_up_traces() -> dict[str, int]:
    """Deletes Langfuse traces older than the retention window.

    Triggered nightly by the Designer scheduler. The agents
    service owns the Langfuse credentials, so the deletion happens here.
    """
    try:
        deleted_count = await delete_expired_traces()
    except Exception:
        log.exception("Scheduled trace cleanup (delete-expired) failed")
        raise HTTPException(status_code=500, detail="Trace cleanup failed")
    return {"deleted": deleted_count}
