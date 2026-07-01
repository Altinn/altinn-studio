"""Maintenance API routes (scheduled housekeeping triggered by Designer)."""

from fastapi import APIRouter

from metrics.langfuse_cleanup import delete_expired_traces
from shared.utils.logging_utils import get_logger

router = APIRouter(prefix="/api/maintenance")
log = get_logger(__name__)


@router.post("/trace-cleanup")
async def clean_up_traces() -> dict[str, int]:
    """Deletes Langfuse traces older than the retention window.

    Intended to be triggered nightly by the Designer scheduler. The agents
    service owns the Langfuse credentials, so the deletion happens here.
    """
    deleted_count = await delete_expired_traces()
    return {"deleted": deleted_count}
