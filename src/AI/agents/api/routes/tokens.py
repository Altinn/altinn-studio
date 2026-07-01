"""Token usage API routes."""

from fastapi import APIRouter

from services.tokens import DailyTokenUsageRow, get_previous_day_token_usage

router = APIRouter(prefix="/api/tokens")


@router.get("/daily")
async def get_daily_usage() -> list[DailyTokenUsageRow]:
    """Returns token usage per service owner for the previous day."""
    return await get_previous_day_token_usage()
