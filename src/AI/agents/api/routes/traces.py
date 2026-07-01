"""Trace API routes: user feedback scores and retention cleanup.

Peripheral to the agent's core function; these endpoints read and maintain
Langfuse trace data.
"""

from typing import ClassVar, Optional

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, field_validator

from services.traces import delete_expired_traces
from shared.utils.langfuse_utils import get_trace_developer, score_validation
from shared.utils.logging_utils import get_logger

router = APIRouter(prefix="/api/traces")
log = get_logger(__name__)

DEVELOPER_HEADER = "X-Developer"


class FeedbackReq(BaseModel):
    """User feedback (thumbs up/down) on an assistant message, recorded as a Langfuse score."""

    comment_max_length: ClassVar[int] = 10000
    thumbs_up: bool
    comment: Optional[str] = None

    @field_validator("comment")
    @classmethod
    def _validate_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > cls.comment_max_length:
            raise ValueError(
                f"comment must not exceed {cls.comment_max_length} characters"
            )
        return v


@router.put("/{trace_id}/feedback", status_code=204)
async def submit_feedback(trace_id: str, req: FeedbackReq, request: Request):
    """Records user feedback as a Langfuse score on the given trace.

    A second PUT for the same trace overwrites the previous score.
    """
    caller = request.headers.get(DEVELOPER_HEADER)
    if not caller:
        raise HTTPException(
            status_code=400, detail=f"Missing {DEVELOPER_HEADER} header"
        )

    trace_owner = get_trace_developer(trace_id)
    if trace_owner != caller:
        raise HTTPException(status_code=403)

    feedback_score_name = "user_feedback"
    score_validation(
        name=feedback_score_name,
        passed=req.thumbs_up,
        trace_id=trace_id,
        comment=req.comment,
        score_id=f"{trace_id}:{feedback_score_name}",
    )
    return Response(status_code=204)


@router.post("/delete-expired")
async def clean_up_traces() -> dict[str, int]:
    """Deletes Langfuse traces older than the retention window.

    Triggered nightly by the Designer scheduler. The agents
    service owns the Langfuse credentials, so the deletion happens here.
    """
    deleted_count = await delete_expired_traces()
    return {"deleted": deleted_count}
