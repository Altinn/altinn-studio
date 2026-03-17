from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from shared.models import AgentAttachment

class ConversationMessage(BaseModel):
    """Single message in conversation history."""
    role: Literal["user", "assistant"]
    content: str
    sources: Optional[List[Dict[str, Any]]] = None  # Sources cited in assistant responses
    
class AgentState(BaseModel):
    session_id: str
    user_goal: str
    repo_path: str
    gitea_token: Optional[str] = None  # Gitea token for git/API operations (passed to MCP)
    attachments: List[AgentAttachment] = Field(default_factory=list)
    conversation_history: List[ConversationMessage] = Field(default_factory=list)  # Previous Q&A pairs
    general_plan: Optional[Dict[str, Any]] = None  # Goal-centric high level plan (LLM only)
    tool_plan: Optional[List[Dict[str, Any]]] = None  # Ordered list of tools to execute
    tool_results: Optional[List[Dict[str, Any]]] = None  # Outputs from executed tools
    implementation_plan: Optional[Dict[str, Any]] = None  # Detailed plan from planning tool
    repo_facts: Optional[Dict[str, Any]] = None  # Repository facts from scanning
    planning_guidance: Optional[str] = None  # Legacy field (will be replaced by implementation_plan)
    patch_data: Optional[Dict[str, Any]] = None  # Generated patch data
    assistant_response: Optional[Dict[str, Any]] = None  # Response from assistant node (chat mode)
    step_plan: List[str] = []  # Legacy field, kept for compatibility
    plan_step: Optional[Any] = None  # Validated structured plan (avoid forward ref)
    changed_files: List[str] = []
    verify_notes: List[str] = []
    tests_passed: Optional[bool] = None
    next_action: Literal["plan", "scan", "act", "verify", "review", "stop"] = "plan"
    completion_message: Optional[str] = None  # Message explaining why workflow stopped/completed
    limits: Dict[str, Any] = {"max_files": 50, "max_lines": 2000}  # Altinn apps need multiple files (layout, resources, models)