"""Concrete `Tool` implementations for the agentic loop.

The toolset mirrors Claude Code's surface — small, atomic file
operations rather than a single big patch-bundle tool.  The model
makes one focused move per call; results are visible on disk
immediately; errors point at a specific thing to fix on the next
call.

- `repo_tool.ScanRepoTool` — high-level repo summary (layouts,
  models, resources, locales).
- `file_tool.ReadFileTool` / `EditFileTool` / `WriteFileTool` /
  `DiscardFileChangesTool` — the CC-style file surface.
- `verify_tool.VerifyChangesTool` — Altinn-specific validation on
  touched files (in-process, from `agents.altinn`).
- `altinn_tools.LayoutPropsTool` / `DatamodelSyncTool` — schema
  introspection + datamodel codegen (in-process).
- `web_fetch_tool.WebFetchTool` — allowlisted docs fetcher, pairs
  with the `altinn-docs` skill.
- `git_tool.CommitSessionBranchTool` — commits + pushes the session
  branch.
- `skill_tool.SkillTool` — loads a skill's full instructions
  (curated Altinn domain knowledge) on demand.
"""

from .altinn_tools import DatamodelSyncTool, LayoutPropsTool
from .file_tool import (
    DiscardFileChangesTool,
    EditFileTool,
    ReadFileTool,
    WriteFileTool,
)
from .git_tool import CommitSessionBranchTool
from .repo_tool import ScanRepoTool
from .skill_tool import SkillTool
from .verify_tool import VerifyChangesTool
from .web_fetch_tool import WebFetchTool

__all__ = [
    "CommitSessionBranchTool",
    "DatamodelSyncTool",
    "DiscardFileChangesTool",
    "EditFileTool",
    "LayoutPropsTool",
    "ReadFileTool",
    "ScanRepoTool",
    "SkillTool",
    "VerifyChangesTool",
    "WebFetchTool",
    "WriteFileTool",
]
