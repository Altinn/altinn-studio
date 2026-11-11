"""Attachments and an LLM client stub, for tests of how attachments reach the model."""

from __future__ import annotations

from base64 import b64encode
from pathlib import Path

from langchain_core.messages import HumanMessage

from agents.services.llm.llm_client import LLMClient
from shared.models.attachments import AgentAttachment


def make_attachment(tmp_path: Path, name: str, mime: str, payload: bytes) -> AgentAttachment:
    file_path = tmp_path / name
    file_path.write_bytes(payload)
    return AgentAttachment(
        name=name,
        mime_type=mime,
        size=len(payload),
        path=file_path,
        data_base64=b64encode(payload).decode("ascii"),
    )


def stub_llm_client() -> LLMClient:
    """A client that can build messages without an API key."""
    client = LLMClient.__new__(LLMClient)
    client.supports_vision = True
    client.model = "test-model"
    return client


def content_blocks(message: HumanMessage) -> list[dict]:
    """The content blocks of a multimodal message. Fail when the content is plain text."""
    assert isinstance(message.content, list)
    blocks = [block for block in message.content if isinstance(block, dict)]
    assert len(blocks) == len(message.content)
    return blocks
