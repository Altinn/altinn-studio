from typing import Any, Literal

from pydantic import BaseModel

EventType = Literal[
    "plan_proposed",
    "error",
    "status",
    "assistant_message",
    "assistant_message_chunk",
    "permission_request",
    "done",
]


class AgentEvent(BaseModel):
    type: EventType
    session_id: str
    data: dict[str, Any]
