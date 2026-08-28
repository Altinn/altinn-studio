# System Prompts

This directory contains all LLM system and user prompts used throughout the agent workflow.

## Structure

```
prompts/
├── README.md
├── loader.py                    # Prompt loading utilities
├── __init__.py
├── intake_planning.md           # System prompts (static)
├── spec_extraction.md
├── semantic_query_extraction.md
├── intent_security.md
├── goal_suggestions.md
├── scope_check.md
├── llm-as-a-judge/              # Langfuse-managed evaluator prompts
└── templates/                   # User prompts (with variables)
    ├── intake_planning_user.md
    ├── spec_extraction_user.md
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

Stored in `templates/` subdirectory with **variable placeholders** using `{{variable}}` syntax (same as Langfuse):

```markdown
USER GOAL:
{{user_goal}}

Return JSON with:
{
"goal_summary": "one paragraph"
}
```

## Usage

### Load System Prompts

```python
from agents.prompts import get_prompt_content

system_prompt = get_prompt_content("intake_planning")
# Returns the content as a string
```

### Render User Templates

```python
from agents.prompts import render_template

user_prompt = render_template(
    "intake_planning_user",
    user_goal="Add a new field",
)
# Returns rendered template with variables substituted
```

## Langfuse Prompt Management

When `LANGFUSE_ENABLED=true`, the loader automatically tries to fetch prompts from Langfuse **before** falling back to local `.md` files. No additional flag is needed.

### How It Works

1. **`get_prompt_content("intake_planning")`** — Tries Langfuse `client.get_prompt("intake_planning", type="text")`, falls back to `intake_planning.md`
2. **`render_template("intake_planning_user", user_goal=...)`** — Tries Langfuse `client.get_prompt("intake_planning_user", type="text").compile(user_goal=...)`, falls back to `templates/intake_planning_user.md`

If Langfuse is down or a prompt doesn't exist there, it silently falls back to local files.

### Setting Up Prompts in Langfuse

To use a prompt from Langfuse instead of the local file:

1. **Go to your Langfuse dashboard** (e.g. `https://langfuse.digdir.cloud`)
2. **Navigate to Prompts** in the sidebar
3. **Create a new prompt** with these settings:
   - **Name**: Must match the local filename without `.md` (e.g. `intake_planning`); see the naming table below. Evaluator prompts under `llm-as-a-judge/` are set up separately as Langfuse evaluators (see [LLM-as-a-judge prompts](#llm-as-a-judge-prompts)).
   - **Type**: `Text` (not Chat)
   - **Content**: Paste the prompt content (without YAML frontmatter for system prompts)
4. **Label it `production`** — By default, `get_prompt()` fetches the version labeled `production`. If no version has this label, the fetch will fail and fall back to local.

### Prompt Naming Reference

The Langfuse prompt name is the local filename without its `.md` extension and
without any folder prefix. This holds for every prompt loaded by application
code, whether it is a system prompt in `prompts/` or a user template in
`templates/`:

```python
get_prompt_with_langfuse("intake_planning")
```

| Local file                          | Langfuse prompt name        |
| ----------------------------------- | --------------------------- |
| `intake_planning.md`                | `intake_planning`           |
| `spec_extraction.md`                | `spec_extraction`           |
| `semantic_query_extraction.md`      | `semantic_query_extraction` |
| `intent_security.md`                | `intent_security`           |
| `goal_suggestions.md`               | `goal_suggestions`          |
| `scope_check.md`                    | `scope_check`               |
| `templates/intake_planning_user.md` | `intake_planning_user`      |
| `templates/spec_extraction_user.md` | `spec_extraction_user`      |
| `templates/semantic_query_user.md`  | `semantic_query_user`       |

### LLM-as-a-judge prompts

The files under `llm-as-a-judge/` are NOT loaded by application code.
Evaluation runs as **Langfuse-managed evaluators** (Evaluation → Evaluators
in the UI), triggered by trace observations — not from this service. The
local files are kept as the version-controlled source of the evaluator
prompts: edit the file here, then paste the update into the corresponding
evaluator in the Langfuse UI.

| Local file                                  | Langfuse evaluator        |
| ------------------------------------------- | ------------------------- |
| `llm-as-a-judge/intent_match.md`            | `intent_match`            |
| `llm-as-a-judge/no_hallucination.md`        | `no_hallucination`        |
| `llm-as-a-judge/faithful_summary.md`        | `faithful_summary`        |
| `llm-as-a-judge/no_irrelevant_responses.md` | `no_irrelevant_responses` |

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

- `intake_planning.md` - Initial high-level plan from user request
- `spec_extraction.md` - Extract a structured spec from attachments
- `semantic_query_extraction.md` - Extract technical concepts for semantic search
- `intent_security.md` - Security-focused intent parsing
- `goal_suggestions.md` - Generate clear goal examples from unclear input
- `scope_check.md` - Pre-gate classifier: is a Q&A question in scope for Altinn app development

### User Templates

- `templates/intake_planning_user.md` - User goal → High-level plan
- `templates/spec_extraction_user.md` - User goal → Structured spec
- `templates/semantic_query_user.md` - User input → Semantic search query
