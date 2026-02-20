from __future__ import annotations

from base64 import b64decode
import shutil
from pathlib import Path
from typing import Optional
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

    def _extract_pdf_text(self) -> Optional[str]:
        """Extract text content from PDF file."""
        try:
            from pypdf import PdfReader
            
            reader = PdfReader(self.path)
            text_parts = []
            
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text()
                if page_text.strip():
                    text_parts.append(f"--- Page {page_num} ---\n{page_text}")
            
            if text_parts:
                return "\n\n".join(text_parts)
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract text from PDF {self.name}: {e}")
            return None

    def to_content_block(self) -> Optional[dict]:
        # Handle images as visual content
        if self.mime_type.startswith("image/") and self.data_base64:
            return {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{self.mime_type};base64,{self.data_base64}"
                },
            }
        
        # Handle PDFs by extracting text content
        if self.mime_type == "application/pdf":
            pdf_text = self._extract_pdf_text()
            if pdf_text:
                return {
                    "type": "text",
                    "text": f"PDF Document: {self.name}\n\n{pdf_text}"
                }
            # Fallback if extraction fails
            return {
                "type": "text",
                "text": f"PDF Document: {self.name} (text extraction failed, file saved to {self.path})"
            }
        
        # Handle other file types
        if self.data_base64:
            text = f"Attachment {self.name} ({self.mime_type}) base64:\n{self.data_base64}"
            return {"type": "text", "text": text}
        return {"type": "text", "text": f"Attachment {self.name} saved to {self.path}"}


def get_session_dir(root: Path, session_id: str) -> Path:
    return root / session_id


def cleanup_session_attachments(root: Path, session_id: str):
    directory = get_session_dir(root, session_id)
    if directory.exists():
        shutil.rmtree(directory)
