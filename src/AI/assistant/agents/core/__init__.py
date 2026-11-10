"""Agentic core: the model-driven loop and its supporting primitives.

Everything the loop needs: the provider adapters, the tool registry and
its built-in tools (scan/read/edit/write/verify/commit + Altinn schema
tools + skills + docs fetch), the message types, and `run_loop` itself.
"""

from .compaction import CompactionConfig
from .context import SessionContext, build_system_prompt
from .llm_adapter import (
    AnthropicAdapter,
    LLMAdapter,
    OpenAIAdapter,
    build_adapter,
)
from .loop import EventCallback, LoopResult, TerminationReason, run_loop
from .messages import (
    AssistantMessage,
    ContentBlock,
    Message,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    extract_text,
    extract_tool_uses,
)
from .registry import (
    PreparedCall,
    ToolArgsInvalidError,
    ToolNotFoundError,
    ToolRegistry,
)
from .skills import Skill, discover_skills, format_skill_listing
from .tool import LoopContext, PermissionResult, Tool, ToolResult
from .tools import (
    CommitSessionBranchTool,
    DatamodelSyncTool,
    DiscardFileChangesTool,
    EditFileTool,
    LayoutPropsTool,
    PreviewRenderCheckTool,
    ReadFileTool,
    ScanRepoTool,
    SkillTool,
    VerifyChangesTool,
    WebFetchTool,
    WriteFileTool,
)

__all__ = [
    "AnthropicAdapter",
    "AssistantMessage",
    "CommitSessionBranchTool",
    "CompactionConfig",
    "ContentBlock",
    "DatamodelSyncTool",
    "DiscardFileChangesTool",
    "EditFileTool",
    "EventCallback",
    "LLMAdapter",
    "LayoutPropsTool",
    "LoopContext",
    "LoopResult",
    "Message",
    "OpenAIAdapter",
    "PermissionResult",
    "PreparedCall",
    "PreviewRenderCheckTool",
    "ReadFileTool",
    "ScanRepoTool",
    "SessionContext",
    "Skill",
    "SkillTool",
    "TerminationReason",
    "TextBlock",
    "Tool",
    "ToolArgsInvalidError",
    "ToolNotFoundError",
    "ToolRegistry",
    "ToolResult",
    "ToolResultBlock",
    "ToolUseBlock",
    "UserMessage",
    "VerifyChangesTool",
    "WebFetchTool",
    "WriteFileTool",
    "build_adapter",
    "build_system_prompt",
    "discover_skills",
    "extract_text",
    "extract_tool_uses",
    "format_skill_listing",
    "run_loop",
]
