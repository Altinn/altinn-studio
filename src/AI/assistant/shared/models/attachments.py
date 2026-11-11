from __future__ import annotations

import logging
import shutil
from base64 import b64decode, b64encode
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator

logger = logging.getLogger(__name__)

# A browser that has no type for an extension, such as Markdown on Windows,
# uploads the file as application/octet-stream.
_TEXT_SUFFIXES = frozenset({".md", ".markdown", ".txt"})
_UNKNOWN_MIME_TYPES = frozenset({"", "application/octet-stream"})


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

    def _ensure_base64(self) -> str | None:
        """Return base64-encoded file data, reading from disk if necessary."""
        if self.data_base64:
            return self.data_base64
        if self.path and self.path.exists():
            return b64encode(self.path.read_bytes()).decode("ascii")
        return None

    def _is_text(self) -> bool:
        mime_type = self.mime_type.split(";", 1)[0].strip().lower()
        if mime_type.startswith("text/"):
            return True
        return mime_type in _UNKNOWN_MIME_TYPES and Path(self.name).suffix.lower() in _TEXT_SUFFIXES

    def _read_text(self) -> str | None:
        """Return the file decoded as UTF-8, or None when no data is available."""
        if self.data_base64:
            raw = b64decode(self.data_base64)
        elif self.path and self.path.exists():
            raw = self.path.read_bytes()
        else:
            return None
        try:
            return raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            logger.warning("Attachment %s is not valid UTF-8; replacing the invalid bytes", self.name)
            return raw.decode("utf-8-sig", errors="replace")

    def _text_blocks(self) -> list[dict] | None:
        """Send a text file as a text block.

        Azure OpenAI accepts only PDFs as file input. Anthropic also takes a
        text `document` block, but its content sits in `source.data`, where the
        caller's spotlighting does not escape a closing tag.
        """
        if not self._is_text():
            return None
        text = self._read_text()
        if text is None:
            return None
        return [{"type": "text", "text": f"Attachment {self.name}:\n\n{text}"}]

    def to_content_blocks(self) -> list[dict]:
        """Convert attachment to LLM content blocks.

        Sends text files as text and other files natively, so the model
        receives the original document.  Falls back to a text placeholder
        when no data is available.
        """
        text_blocks = self._text_blocks()
        if text_blocks:
            return text_blocks

        data = self._ensure_base64()

        if self.mime_type.startswith("image/") and data:
            return [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{self.mime_type};base64,{data}"},
                }
            ]

        if data:
            return [
                {
                    "type": "file",
                    "file": {
                        "filename": self.name,
                        "file_data": f"data:{self.mime_type};base64,{data}",
                    },
                }
            ]

        return [{"type": "text", "text": f"Attachment {self.name} ({self.mime_type}) — file data unavailable"}]

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
        text_blocks = self._text_blocks()
        if text_blocks:
            return text_blocks

        data = self._ensure_base64()

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

        return [
            {
                "type": "text",
                "text": f"Attachment {self.name} ({self.mime_type}) — file data unavailable or unsupported format",
            }
        ]


def get_session_dir(root: Path, session_id: str) -> Path:
    return root / session_id


def cleanup_session_attachments(root: Path, session_id: str):
    directory = get_session_dir(root, session_id)
    if directory.exists():
        shutil.rmtree(directory)
