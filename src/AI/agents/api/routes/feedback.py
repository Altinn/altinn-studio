"""User feedback API routes"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, field_validator

from shared.utils.langfuse_utils import get_trace_developer, score_validation
from shared.utils.logging_utils import get_logger

router = APIRouter()
log = get_logger(__name__)

FEEDBACK_SCORE_NAME = "user_feedback"
FEEDBACK_COMMENT_MAX_LENGTH = 10000
DEVELOPER_HEADER = "X-Developer"


class FeedbackReq(BaseModel):
    """User feedback (thumbs up/down) on an assistant message, recorded as a Langfuse score."""

    trace_id: str
    thumbs_up: bool
    comment: Optional[str] = None

    @field_validator("trace_id")
    @classmethod
    def _validate_trace_id(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("trace_id must be non-empty")
        return v

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


@router.post("/api/feedback", status_code=204)
async def submit_feedback(req: FeedbackReq, request: Request):
    """Records user feedback as a Langfuse score on the given trace."""
    caller = request.headers.get(DEVELOPER_HEADER)
    if not caller:
        raise HTTPException(
            status_code=400, detail=f"Missing {DEVELOPER_HEADER} header"
        )

    trace_owner = get_trace_developer(req.trace_id)
    if trace_owner != caller:
        raise HTTPException(status_code=403)

    score_validation(
        name=FEEDBACK_SCORE_NAME,
        passed=req.thumbs_up,
        trace_id=req.trace_id,
        comment=req.comment,
    )
    return Response(status_code=204)
