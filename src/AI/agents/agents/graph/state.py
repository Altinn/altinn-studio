from shared.models.experiment import ExperimentContext
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator
from shared.models import AgentAttachment

class ConversationMessage(BaseModel):
    """Single message in conversation history."""
    role: Literal["user", "assistant"]
    content: str
    sources: Optional[List[Dict[str, Any]]] = None  # Sources cited in assistant responses


class FormSpecOption(BaseModel):
    """One choice for a radio/checkbox/dropdown field.

    Altinn needs both a display `label` (what the user sees) and a stable
    `value` (what gets stored in the data model).  We keep them separate
    so a label change later doesn't migrate stored data.
    """
    label: str
    value: str


class FormSpecField(BaseModel):
    """A single field extracted from a PDF/image attachment."""
    id: str  # Machine-friendly ID derived from label (e.g., "sokerens-navn")
    label: str  # Exact label text from the document (original language)
    description: Optional[str] = None  # Help text / tooltip content
    field_type: str  # text, checkbox, radio, dropdown, date, textarea, number, header, paragraph
    options: Optional[List[FormSpecOption]] = None  # For radio/checkbox/dropdown
    required: bool = False
    data_model_binding: Optional[str] = None  # Suggested binding path (e.g., "applicant.name")

    @field_validator("options", mode="before")
    @classmethod
    def _coerce_options(cls, value: Any) -> Any:
        """Lift legacy `List[str]` options to `List[{label, value}]`.

        Older spec-extraction prompts sometimes return plain strings; we
        normalize them so downstream code only ever sees the structured
        form.  Slugifying the value here keeps stored data stable across
        label edits.
        """
        if value is None:
            return value
        if not isinstance(value, list):
            return value  # let pydantic raise the right error
        coerced: List[Any] = []
        for item in value:
            if isinstance(item, str):
                coerced.append({"label": item, "value": _slugify_option_value(item)})
            else:
                coerced.append(item)
        return coerced


def _slugify_option_value(text: str) -> str:
    """Stable, code-safe value derived from an option's label.

    `Ny bevilling` → `ny-bevilling`.  Lowercases, ASCII-folds the
    Norwegian extras (æøå → ae/oe/aa), and collapses non-alphanumerics
    to single hyphens.  Used only as a last-resort fallback — the model
    should return explicit `value`s.
    """
    import re
    folded = (
        text.lower()
        .replace("æ", "ae")
        .replace("ø", "oe")
        .replace("å", "aa")
    )
    slug = re.sub(r"[^a-z0-9]+", "-", folded).strip("-")
    return slug or "option"


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

    @staticmethod
    def _sanitize(text: str, max_length: int = 200) -> str:
        """Strip control characters and truncate to prevent prompt injection."""
        clean = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")
        return clean[:max_length]

    def to_summary(self) -> str:
        """Compact summary for inclusion in prompts."""
        safe_title = self._sanitize(self.title)
        lines = [f"FORM SPEC: \"{safe_title}\" ({self.language}), {self.total_pages} pages, {self.field_count()} fields"]
        for page in self.pages:
            safe_page_title = self._sanitize(page.title)
            section = f" (Section {self._sanitize(page.section_id, 20)})" if page.section_id else ""
            lines.append(f"\n  Page: {page.page_name}{section} — \"{safe_page_title}\"")
            for f in page.fields:
                label = self._sanitize(f.label)
                desc = f" — {self._sanitize(f.description)}" if f.description else ""
                opts = (
                    " [" + ", ".join(
                        f"{self._sanitize(o.label, 60)} ({self._sanitize(o.value, 40)})"
                        for o in f.options[:20]
                    ) + "]"
                ) if f.options else ""
                req = " *" if f.required else ""
                lines.append(f"    - [{f.field_type}] \"{label}\"{desc}{opts}{req}")
        return "\n".join(lines)


class AgentState(BaseModel):
    session_id: str
    user_goal: str
    repo_path: str
    app_name: str
    developer: str
    experiment: Optional["ExperimentContext"] = None
    org: str
    designer_api_key: Optional[str] = None  # Designer API key for git operations through Gitea proxy
    trace_id: Optional[str] = None  # Langfuse trace id, captured once at the root span
    # Hard permission gate: when False the loop runs read-only (write tools
    # denied) — the "chat mode" of the unified path. Fail closed: write
    # access is opt-in, so a constructor that omits the flag gets read-only.
    allow_app_changes: bool = False
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