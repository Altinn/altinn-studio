from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel

class AgentState(BaseModel):
    session_id: str
    user_goal: str
    repo_path: str
    step_plan: List[str] = []
    changed_files: List[str] = []
    verify_notes: List[str] = []
    tests_passed: Optional[bool] = None
    next_action: Literal["plan", "act", "verify", "review", "stop"] = "plan"
    limits: Dict[str, Any] = {"max_files": 50, "max_lines": 2000}  # Altinn apps need multiple files (layout, resources, models)