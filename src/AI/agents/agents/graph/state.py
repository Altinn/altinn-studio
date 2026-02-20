from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from shared.models import AgentAttachment

class ConversationMessage(BaseModel):
    """Single message in conversation history."""
    role: Literal["user", "assistant"]
    content: str
    sources: Optional[List[Dict[str, Any]]] = None  # Sources cited in assistant responses


class FormSpecField(BaseModel):
    """A single field extracted from a PDF/image attachment."""
    id: str  # Machine-friendly ID derived from label (e.g., "sokerens-navn")
    label: str  # Exact label text from the document (original language)
    description: Optional[str] = None  # Help text / tooltip content
    field_type: str  # text, checkbox, radio, dropdown, date, textarea, number, header, paragraph
    options: Optional[List[str]] = None  # For radio/checkbox/dropdown
    required: bool = False
    data_model_binding: Optional[str] = None  # Suggested binding path (e.g., "applicant.name")


class FormSpecPage(BaseModel):
    """A page/section in the form spec."""
    page_name: str  # Layout file name (e.g., "side1")
    title: str  # Page/section title from the document
    section_id: Optional[str] = None  # Section identifier (e.g., "A", "B")
    fields: List[FormSpecField] = Field(default_factory=list)


class FormSpec(BaseModel):
    """Complete specification extracted from a PDF/image attachment.
    
    This is the single source of truth for what the generated form must contain.
    All downstream agents (planner, actor, verifier) reference this spec.
    """
    title: str  # Form title from the document (original language)
    language: str = "nb"  # Detected language of the document
    total_pages: int = 1
    pages: List[FormSpecPage] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)  # Extra info (form number, version, etc.)

    def field_count(self) -> int:
        return sum(len(p.fields) for p in self.pages)

    def to_summary(self) -> str:
        """Compact summary for inclusion in prompts."""
        lines = [f"FORM SPEC: \"{self.title}\" ({self.language}), {self.total_pages} pages, {self.field_count()} fields"]
        for page in self.pages:
            section = f" (Section {page.section_id})" if page.section_id else ""
            lines.append(f"\n  Page: {page.page_name}{section} — \"{page.title}\"")
            for f in page.fields:
                desc = f" — {f.description}" if f.description else ""
                opts = f" [{', '.join(f.options)}]" if f.options else ""
                req = " *" if f.required else ""
                lines.append(f"    - [{f.field_type}] \"{f.label}\"{desc}{opts}{req}")
        return "\n".join(lines)


class AgentState(BaseModel):
    session_id: str
    user_goal: str
    repo_path: str
    attachments: List[AgentAttachment] = Field(default_factory=list)
    conversation_history: List[ConversationMessage] = Field(default_factory=list)  # Previous Q&A pairs
    form_spec: Optional[FormSpec] = None  # Structured spec extracted from attachments by spec agent
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
    next_action: Literal["plan", "scan", "spec", "act", "verify", "review", "stop"] = "plan"
    limits: Dict[str, Any] = {"max_files": 50, "max_lines": 2000}  # Altinn apps need multiple files (layout, resources, models)