from __future__ import annotations

import logging
import mimetypes
import shutil
from base64 import b64decode, b64encode
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

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

    def to_agent_attachment(self, base_dir: Path) -> AgentAttachment:
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
    data_base64: str | None = None
    azure_file_id: str | None = None

    @field_validator("mime_type")
    @classmethod
    def _resolve_mime_type(cls, value: str, info: ValidationInfo) -> str:
        """Normalize the type the browser sent, and guess it from the name when it sent none.

        A browser uploads an extension it has no type for, such as Markdown on
        Windows, as application/octet-stream.
        """
        mime_type = value.split(";", 1)[0].strip().lower()
        if mime_type in ("", "application/octet-stream"):
            return mimetypes.guess_type(info.data.get("name", ""))[0] or mime_type
        return mime_type

    def _ensure_base64(self) -> str | None:
        """Return base64-encoded file data, reading from disk if necessary."""
        if self.data_base64:
            return self.data_base64
        if self.path and self.path.exists():
            return b64encode(self.path.read_bytes()).decode("ascii")
        return None

    def _text_block(self, data: str) -> dict:
        """Send a text file as text.

        Azure OpenAI accepts only PDFs as file input. Anthropic also takes a
        text `document` block, but its content sits in `source.data`, where the
        caller's spotlighting does not escape a closing tag.
        """
        raw = b64decode(data)
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            logger.warning("Attachment %s is not valid UTF-8; replacing the invalid bytes", self.name)
            text = raw.decode("utf-8-sig", errors="replace")
        return {"type": "text", "text": f"Attachment {self.name}:\n\n{text}"}

    def _placeholder_block(self) -> dict:
        return {
            "type": "text",
            "text": f"Attachment {self.name} ({self.mime_type}) — file data unavailable or unsupported format",
        }

    def to_content_blocks(self) -> list[dict]:
        """Convert attachment to LLM content blocks.

        Sends text as text, and images and PDFs natively, so the model
        receives the original document.  Falls back to a text placeholder
        when no data is available or the model takes no such file.
        """
        data = self._ensure_base64()

        if data and self.mime_type.startswith("text/"):
            return [self._text_block(data)]

        if self.mime_type.startswith("image/") and data:
            return [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{self.mime_type};base64,{data}"},
                }
            ]

        if data and self.mime_type == "application/pdf":
            return [
                {
                    "type": "file",
                    "file": {
                        "filename": self.name,
                        "file_data": f"data:{self.mime_type};base64,{data}",
                    },
                }
            ]

        return [self._placeholder_block()]

    def to_content_block(self) -> dict | None:
        """Legacy single-block method. Returns the first content block."""
        blocks = self.to_content_blocks()
        return blocks[0] if blocks else None

    def to_anthropic_blocks(self) -> list[dict]:
        """Convert to Anthropic Messages-API content blocks.

        The Anthropic SDK uses a different shape than the OpenAI/LangChain
        blocks returned by `to_content_blocks` — images use a `source`
        sub-object, and PDFs go through a dedicated `document` block.
        Without this routing the file would be silently ignored.

        Returns a text-only fallback when no file data is available so
        the model at least learns *that* an attachment was meant to be
        there.
        """
        data = self._ensure_base64()

        if data and self.mime_type.startswith("text/"):
            return [self._text_block(data)]

        if data and self.mime_type.startswith("image/"):
            return [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": self.mime_type,
                        "data": data,
                    },
                }
            ]

        if data and self.mime_type == "application/pdf":
            return [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": data,
                    },
                    "title": self.name,
                }
            ]

        return [self._placeholder_block()]


def get_session_dir(root: Path, session_id: str) -> Path:
    return root / session_id


def cleanup_session_attachments(root: Path, session_id: str):
    directory = get_session_dir(root, session_id)
    if directory.exists():
        shutil.rmtree(directory)
