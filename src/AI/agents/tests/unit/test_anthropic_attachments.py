"""Tests for the Anthropic attachment wiring.

Covers `AgentAttachment.to_anthropic_blocks()` (the format the Messages
API expects) and `_build_anthropic_user_content()` (the helper that
glues attachments into the user-message `content` field).
"""

from __future__ import annotations

from base64 import b64encode
from pathlib import Path

from agents.services.llm.llm_client import _build_anthropic_user_content
from shared.models.attachments import AgentAttachment


def _make_attachment(tmp_path: Path, name: str, mime: str, payload: bytes) -> AgentAttachment:
    file_path = tmp_path / name
    file_path.write_bytes(payload)
    return AgentAttachment(
        name=name,
        mime_type=mime,
        size=len(payload),
        path=file_path,
        data_base64=b64encode(payload).decode("ascii"),
    )


class TestToAnthropicBlocks:
    def test_pdf_becomes_document_block(self, tmp_path: Path):
        att = _make_attachment(tmp_path, "form.pdf", "application/pdf", b"%PDF-1.4 fake")
        blocks = att.to_anthropic_blocks()
        assert len(blocks) == 1
        block = blocks[0]
        assert block["type"] == "document"
        assert block["source"]["type"] == "base64"
        assert block["source"]["media_type"] == "application/pdf"
        assert block["source"]["data"] == b64encode(b"%PDF-1.4 fake").decode("ascii")
        assert block["title"] == "form.pdf"

    def test_png_becomes_image_block_with_source_shape(self, tmp_path: Path):
        att = _make_attachment(tmp_path, "shot.png", "image/png", b"\x89PNG\r\n")
        blocks = att.to_anthropic_blocks()
        assert len(blocks) == 1
        block = blocks[0]
        # Anthropic's `image` block uses `source`, not `image_url` — this
        # is the difference from the OpenAI/LangChain shape.
        assert block["type"] == "image"
        assert block["source"]["type"] == "base64"
        assert block["source"]["media_type"] == "image/png"

    def test_unknown_mime_falls_back_to_text_placeholder(self, tmp_path: Path):
        att = _make_attachment(tmp_path, "weird.bin", "application/x-foo", b"\x00\x01")
        blocks = att.to_anthropic_blocks()
        assert len(blocks) == 1
        assert blocks[0]["type"] == "text"
        assert "weird.bin" in blocks[0]["text"]
        assert "application/x-foo" in blocks[0]["text"]

    def test_no_data_returns_text_fallback(self, tmp_path: Path):
        # Path that doesn't exist + no data_base64 → fallback path.
        att = AgentAttachment(
            name="ghost.pdf",
            mime_type="application/pdf",
            size=0,
            path=tmp_path / "ghost.pdf",
            data_base64=None,
        )
        blocks = att.to_anthropic_blocks()
        assert blocks[0]["type"] == "text"
        assert "ghost.pdf" in blocks[0]["text"]


class TestBuildAnthropicUserContent:
    def test_no_attachments_returns_bare_string(self):
        out = _build_anthropic_user_content("hello", None)
        assert out == "hello"

    def test_empty_attachments_returns_bare_string(self):
        out = _build_anthropic_user_content("hello", [])
        assert out == "hello"

    def test_with_attachments_returns_block_list(self, tmp_path: Path):
        att = _make_attachment(tmp_path, "form.pdf", "application/pdf", b"%PDF")
        out = _build_anthropic_user_content("Extract fields", [att])
        assert isinstance(out, list)
        # text first, document second
        assert out[0] == {"type": "text", "text": "Extract fields"}
        assert out[1]["type"] == "document"
        assert out[1]["source"]["media_type"] == "application/pdf"

    def test_empty_prompt_with_attachment_omits_text_block(self, tmp_path: Path):
        att = _make_attachment(tmp_path, "form.pdf", "application/pdf", b"%PDF")
        out = _build_anthropic_user_content("", [att])
        # No empty `text` block — keeps the request minimal.
        assert isinstance(out, list)
        assert len(out) == 1
        assert out[0]["type"] == "document"
