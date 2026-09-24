"""Shared data models for the Altinity Agents system"""

from .attachments import AgentAttachment, AttachmentUpload
from .common_models import ErrorResponse

__all__ = ["AgentAttachment", "AttachmentUpload", "ErrorResponse"]
