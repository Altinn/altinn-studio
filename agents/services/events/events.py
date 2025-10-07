from pydantic import BaseModel
from typing import Any, Literal, Optional, Dict, List

class AgentEvent(BaseModel):
    type: Literal[
        "plan_proposed",
        "patch_preview",
        "verify_result",
        "commit_done",
        "reverted",
        "blocked",
        "error",
        "status"
    ]
    session_id: str
    data: Dict[str, Any]