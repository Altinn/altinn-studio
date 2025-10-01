"""Common data models"""
from typing import Optional, Dict, Any, TYPE_CHECKING
from pydantic import BaseModel

if TYPE_CHECKING:
    from .app_models import AppInfo


class StatusResponse(BaseModel):
    """System status response"""
    status: str
    services: Dict[str, Any]
    active_sessions: int
    current_app: Optional["AppInfo"] = None


class ChatMessage(BaseModel):
    """Chat message from frontend"""
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Chat response to frontend"""
    response: str
    session_id: str
    timestamp: float


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    details: Optional[str] = None
    error_code: Optional[str] = None