"""Common data models"""
from typing import Optional
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    details: Optional[str] = None
    error_code: Optional[str] = None