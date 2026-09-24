"""Common data models"""

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Error response model"""

    error: str
    details: str | None = None
    error_code: str | None = None
