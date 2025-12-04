"""Shared data models for the Altinity Agents system"""

from .common_models import ErrorResponse
from .attachments import AttachmentUpload, AgentAttachment

__all__ = [
    "ErrorResponse",
    "AttachmentUpload",
    "AgentAttachment"
]