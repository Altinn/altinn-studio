from __future__ import annotations

from base64 import b64decode, b64encode
import shutil
from pathlib import Path
from typing import List, Optional
from uuid import uuid4
import logging

from pydantic import BaseModel, Field, field_validator, ConfigDict

logger = logging.getLogger(__name__)


class AttachmentUpload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    mime_type: str = Field(alias="mimeType")
    size: int
    data_base64: str = Field(alias="dataBase64")

    @field_validator("data_base64")
    @classmethod
    def _validate_base64(cls, value: str) -> str:
        payload = value.split(",", 1)[-1]
        b64decode(payload.encode(), validate=True)
        return value

    def to_agent_attachment(self, base_dir: Path) -> "AgentAttachment":
        base_dir.mkdir(parents=True, exist_ok=True)
        payload = self.data_base64.split(",", 1)[-1]
        data = b64decode(payload.encode())
        safe_name = Path(self.name).name or f"attachment_{uuid4().hex}"
        path = base_dir / safe_name
        counter = 1
        while path.exists():
            path = base_dir / f"{Path(safe_name).stem}_{counter}{Path(safe_name).suffix}"
            counter += 1
        with open(path, "wb") as file:
            file.write(data)
        return AgentAttachment(
            name=path.name,
            mime_type=self.mime_type,
            size=self.size,
            path=path,
            data_base64=payload,
        )


class AgentAttachment(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    name: str
    mime_type: str
    size: int
    path: Path
    data_base64: Optional[str] = None
    azure_file_id: Optional[str] = None

    def _ensure_base64(self) -> Optional[str]:
        """Return base64-encoded file data, reading from disk if necessary."""
        if self.data_base64:
            return self.data_base64
        if self.path and self.path.exists():
            return b64encode(self.path.read_bytes()).decode("ascii")
        return None

    def to_content_blocks(self) -> List[dict]:
        """Convert attachment to LLM content blocks.

        Prefers native file passthrough so the model receives the original
        document.  Falls back to a text placeholder when no data is available.
        """
        data = self._ensure_base64()

        if self.mime_type.startswith("image/") and data:
            return [{
                "type": "image_url",
                "image_url": {
                    "url": f"data:{self.mime_type};base64,{data}"
                },
            }]

        if data:
            return [{
                "type": "file",
                "file": {
                    "filename": self.name,
                    "file_data": f"data:{self.mime_type};base64,{data}",
                },
            }]

        return [{"type": "text", "text": f"Attachment {self.name} ({self.mime_type}) — file data unavailable"}]

    def to_content_block(self) -> Optional[dict]:
        """Legacy single-block method. Returns the first content block."""
        blocks = self.to_content_blocks()
        return blocks[0] if blocks else None


def get_session_dir(root: Path, session_id: str) -> Path:
    return root / session_id


def cleanup_session_attachments(root: Path, session_id: str):
    directory = get_session_dir(root, session_id)
    if directory.exists():
        shutil.rmtree(directory)
