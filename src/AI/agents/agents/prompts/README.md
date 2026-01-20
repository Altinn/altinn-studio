# System Prompts

This directory contains all LLM system and user prompts used throughout the agent workflow.

## Structure

```
prompts/
├── README.md
├── loader.py                    # Prompt loading utilities
├── __init__.py
├── general_planning.md          # System prompts (static)
├── tool_planning.md
├── detailed_planning.md
├── patch_synthesis.md
├── intent_security.md
├── goal_suggestions.md
├── semantic_query_extraction.md
├── intake_planning.md
├── planner_initial.md
├── reviewer_decision.md
├── verifier_error_fixer.md
├── assistant_tool_orchestration.md
├── assistant_response_generation.md
├── chat_assistant.md
└── templates/                   # User prompts (with variables)
    ├── intake_planning_user.md
    ├── general_planning_user.md
    ├── planner_initial_user.md
    ├── tool_planning_user.md
    ├── implementation_plan_user.md
    ├── patch_synthesis_user.md
    ├── reviewer_decision_user.md
    ├── verifier_error_fix_user.md
    ├── assistant_tool_selection_user.md
    ├── assistant_response_user.md
    ├── chat_assistant_user.md
    └── semantic_query_user.md
```

## Format

### System Prompts

Stored as **Markdown files with YAML frontmatter** (no variables):

```markdown
---
name: Prompt Name
role: planner  # LLM role to use
version: "1.0"
---

Your actual prompt content here...
Can span multiple lines.
Uses markdown formatting.
Much easier to read and edit!
```

### User Prompt Templates

Stored in `templates/` subdirectory with **variable placeholders**:

```markdown
USER GOAL:
{user_goal}

CURRENT PLAN STEP (if any):
{planner_step}

Return JSON with:
{{
  "goal_summary": "one paragraph"
}}
```

**Note:** Use `{{` and `}}` to escape braces in template text (for JSON examples).

## Usage

### Load System Prompts

```python
from agents.prompts import get_prompt_content

system_prompt = get_prompt_content("general_planning")
# Returns the content as a string
```

### Render User Templates

```python
from agents.prompts import render_template

user_prompt = render_template(
    "general_planning_user",
    user_goal="Add a new field",
    planner_step="Step 1"
)
# Returns rendered template with variables substituted
```

## Benefits

- **Readable**: Multi-line format with proper formatting
- **Maintainable**: Easy to edit without escaping characters or concatenating strings
- **Versionable**: Clear version tracking via frontmatter
- **Organized**: One file per prompt, separate system vs user
- **Type-safe**: Frontmatter provides metadata
- **No Inline Strings**: All prompts external to code

## Prompt Files

### System Prompts
- `general_planning.md` - High-level strategic planning
- `tool_planning.md` - Tool orchestration and selection
- `detailed_planning.md` - Detailed implementation planning  
- `patch_synthesis.md` - Patch generation rules and conventions
- `intent_security.md` - Security-focused intent parsing
- `goal_suggestions.md` - Generate clear goal examples from unclear input
- `semantic_query_extraction.md` - Extract technical concepts for semantic search
- `intake_planning.md` - Initial high-level plan from user request
- `planner_initial.md` - Legacy planner for initial plan generation
- `reviewer_decision.md` - Commit or revert decision logic
- `verifier_error_fixer.md` - Auto-fix validation errors with minimal patches
- `assistant_tool_orchestration.md` - Tool selection for Q&A assistant
- `assistant_response_generation.md` - Answer generation for Q&A responses
- `chat_assistant.md` - Simple chat-based Q&A assistance

### User Templates
- `templates/intake_planning_user.md` - User goal → High-level plan
- `templates/general_planning_user.md` - User goal → JSON plan
- `templates/planner_initial_user.md` - User goal → Initial plan (legacy)
- `templates/tool_planning_user.md` - Plan → Tool sequence
- `templates/implementation_plan_user.md` - Documentation → Implementation plan
- `templates/patch_synthesis_user.md` - Implementation → JSON patch
- `templates/reviewer_decision_user.md` - Review context → Commit/revert decision
- `templates/verifier_error_fix_user.md` - Validation errors → Fix patch
- `templates/assistant_tool_selection_user.md` - Question context → Tool selection
- `templates/assistant_response_user.md` - Documentation context → Answer with sources
- `templates/chat_assistant_user.md` - Question + context → Chat response
- `templates/semantic_query_user.md` - User input → Semantic search query
