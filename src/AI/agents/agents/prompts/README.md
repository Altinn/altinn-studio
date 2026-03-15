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
role: planner # LLM role to use
version: '1.0'
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

## Langfuse Prompt Management

When `LANGFUSE_ENABLED=true`, the loader automatically tries to fetch prompts from Langfuse **before** falling back to local `.md` files. No additional flag is needed.

### How It Works

1. **`get_prompt_content("general_planning")`** — Tries Langfuse `client.get_prompt("general_planning", type="text")`, falls back to `general_planning.md`
2. **`render_template("general_planning_user", user_goal=...)`** — Tries Langfuse `client.get_prompt("general_planning_user", type="text").compile(user_goal=...)`, falls back to `templates/general_planning_user.md`

If Langfuse is down or a prompt doesn't exist there, it silently falls back to local files.

### Setting Up Prompts in Langfuse

To use a prompt from Langfuse instead of the local file:

1. **Go to your Langfuse dashboard** (e.g. `https://langfuse.digdir.cloud`)
2. **Navigate to Prompts** in the sidebar
3. **Create a new prompt** with these settings:
   - **Name**: Must match the local filename without `.md` (e.g. `general_planning`, `tool_planning_user`)
   - **Type**: `Text` (not Chat)
   - **Content**: Paste the prompt content (without YAML frontmatter for system prompts)
4. **Label it `production`** — By default, `get_prompt()` fetches the version labeled `production`. If no version has this label, the fetch will fail and fall back to local.

### Variable Syntax Difference

| Source                    | Syntax         | Example         |
| ------------------------- | -------------- | --------------- |
| **Local `.md` templates** | `{variable}`   | `{user_goal}`   |
| **Langfuse templates**    | `{{variable}}` | `{{user_goal}}` |

When creating **user prompt templates** in Langfuse (the ones in `templates/`), convert `{variable}` to `{{variable}}`. For **system prompts** (no variables), copy the content as-is.

### Prompt Naming Reference

| Local file                           | Langfuse prompt name    |
| ------------------------------------ | ----------------------- |
| `general_planning.md`                | `general_planning`      |
| `tool_planning.md`                   | `tool_planning`         |
| `patch_synthesis.md`                 | `patch_synthesis`       |
| `templates/general_planning_user.md` | `general_planning_user` |
| `templates/tool_planning_user.md`    | `tool_planning_user`    |
| `templates/patch_synthesis_user.md`  | `patch_synthesis_user`  |

### Required Environment Variables

```bash
LANGFUSE_ENABLED=true                          # Enables both tracing AND prompt fetching
LANGFUSE_SECRET_KEY=sk-lf-...                  # Your Langfuse secret key
LANGFUSE_PUBLIC_KEY=pk-lf-...                  # Your Langfuse public key
LANGFUSE_BASE_URL=https://langfuse.digdir.cloud  # Your Langfuse host
```

### Caching

The Langfuse SDK caches prompts internally (default 60s TTL). You can override this per-call via `fetch_langfuse_prompt(name, cache_ttl_seconds=300)`.

## Benefits

- **Readable**: Multi-line format with proper formatting
- **Maintainable**: Easy to edit without escaping characters or concatenating strings
- **Versionable**: Clear version tracking via frontmatter
- **Organized**: One file per prompt, separate system vs user
- **Type-safe**: Frontmatter provides metadata
- **No Inline Strings**: All prompts external to code
- **Remote Management**: Edit prompts via Langfuse UI without code changes or redeployment

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
