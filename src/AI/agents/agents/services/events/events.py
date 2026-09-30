from typing import Any, Literal

from pydantic import BaseModel


class AgentEvent(BaseModel):
    type: Literal[
        "plan_proposed",
        "error",
        "status",
        "assistant_message",
        "assistant_message_chunk",
        "permission_request",
        "done",
    ]
    session_id: str
    data: dict[str, Any]
