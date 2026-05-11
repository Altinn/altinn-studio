from fastapi import APIRouter, HTTPException

from metrics import DailyTokenUsageRow, fetch_previous_day_token_usage
from shared.utils.logging_utils import get_logger

router = APIRouter(prefix="/api/metrics", tags=["metrics"])
log = get_logger(__name__)


@router.get("/daily-usage")
async def get_previous_day_token_usage() -> list[DailyTokenUsageRow]:
    """Returns token usage per service owner for the previous day"""
    try:
        return await fetch_previous_day_token_usage()
    except RuntimeError as init_error:
        raise HTTPException(status_code=503, detail=str(init_error)) from init_error
    except Exception as upstream_error:
        log.exception("Failed to fetch LLM token usage from Langfuse")
        raise HTTPException(
            status_code=502,
            detail=f"Langfuse fetch failed: {upstream_error}",
        ) from upstream_error
