# System prompts

This directory contains the system prompts and user prompts for these parts:

- the pre-graph gates
- the intake pipeline
- the spec pipeline.

The system prompt of the agentic loop is not in this directory. `agents/core/context.py` makes it in code.

## Structure

```
prompts/
├── README.md
├── loader.py                    # Functions that load prompts
├── __init__.py
├── intake_planning.md           # System prompts (static)
├── spec_extraction.md
├── intent_security.md
├── goal_suggestions.md
├── scope_check.md
├── retired.json                 # Prompts deleted from Langfuse, kept here as text
├── llm-as-a-judge/              # Evaluator prompts that Langfuse manages
└── templates/                   # User prompts (with variables)
    ├── intake_planning_user.md
    └── spec_extraction_user.md
```

## Format

### System prompts

A system prompt is a **Markdown file with YAML frontmatter**. It has no variables.

```markdown
---
name: Prompt Name
role: planner # The LLM role to use
version: '1.0'
---

The prompt content.
It can have many lines.
It uses Markdown format.
```

### User prompt templates

User prompt templates are in the `templates/` subdirectory. They have **placeholders for variables** with the `{{variable}}` syntax. Langfuse uses the same syntax.

```markdown
USER GOAL:
{{user_goal}}

Return JSON with:
{
"goal_summary": "one paragraph"
}
```

## Usage

### Load a system prompt

```python
from agents.prompts import get_prompt_with_langfuse

system_prompt, langfuse_prompt = get_prompt_with_langfuse("intake_planning")
# Returns the content as a string, and the Langfuse prompt object (None if Langfuse did not serve it)
```

### Render a user template

```python
from agents.prompts import render_template

user_prompt = render_template(
    "intake_planning_user",
    user_goal="Add a new field",
)
# Returns the template with the values of the variables
```

## Langfuse prompt management

When `LANGFUSE_ENABLED=true`, the loader tries to get the prompt from Langfuse first. If this fails, it uses the local `.md` file. You do not set a different flag.

### How it works

1. **`get_prompt_with_langfuse("intake_planning")`** calls `client.get_prompt("intake_planning", type="text")` in Langfuse. If this fails, it uses `intake_planning.md`.
2. **`render_template("intake_planning_user", user_goal=...)`** calls `client.get_prompt("intake_planning_user", type="text").compile(user_goal=...)` in Langfuse. If this fails, it uses `templates/intake_planning_user.md`.

If Langfuse is not available, or the prompt is not in Langfuse, the loader uses the local file. It does not show an error.

### Add or change a prompt

Edit or add the file in this directory, and merge the change. Do not edit the prompt in the Langfuse UI. `.github/workflows/assistant-prompts.yaml` does these steps:

- On each pull request that changes `agents/prompts/`, it runs `--diff`. Thus, you see the differences before the merge.
- On each merge to main, it runs `--push`. This publishes each changed prompt as a new version with the label `production`. If the prompt is not in Langfuse, `--push` makes it. The commit message of the version is the URL of the merge commit.

`--push` does not run unless `ALLOW_PROMPT_PUSH=1` is set. CI sets it. Do not set it on a laptop.

A change in the Langfuse UI does not show in a code review. The workflow shows it as a difference on the next pull request. When `--diff` shows a difference, read it before you do an action. The local file can be older than the Langfuse version.

```bash
python -m scripts.sync_prompts --diff                    # all prompts, repository and Langfuse
python -m scripts.sync_prompts --diff spec_extraction    # one prompt
python -m scripts.sync_prompts --promote spec_extraction --version 1   # go back to an earlier version
```

### Prompt names

The Langfuse prompt name is the local file name without the `.md` extension and without the directory. This rule applies to all prompts that the application code loads. It applies to the system prompts in `prompts/` and to the user templates in `templates/`:

```python
get_prompt_with_langfuse("intake_planning")
```

| Local file                          | Langfuse prompt name   | Purpose                                                          |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `intake_planning.md`                | `intake_planning`      | Makes the first high-level plan from the user request.           |
| `spec_extraction.md`                | `spec_extraction`      | Gets a structured spec from the attachments.                     |
| `intent_security.md`                | `intent_check`         | Parses the intent, with a focus on security. Workflow mode only. |
| `goal_suggestions.md`               | `goal_suggestions`     | Makes clear examples of goals when the input is not clear.       |
| `scope_check.md`                    | `scope_check`          | Decides if a request is about Altinn app development.            |
| `templates/intake_planning_user.md` | `intake_planning_user` | User goal → high-level plan                                      |
| `templates/spec_extraction_user.md` | `spec_extraction_user` | User goal → structured spec                                      |

`intent_security.md` is the only file with a name that is different from its prompt. When the two names are different, give `local_path` to the loader. Also add the pair to `SERVED_FROM` in `scripts/sync_prompts.py`, so that the drift report finds the file.

### Retired prompts

When you delete a prompt file, the prompt stays in Langfuse. It continues to serve its last version. If you add the name again later, the agent serves this old text, and nobody sees it.

`scripts/sync_prompts.py --diff` shows each Langfuse prompt that has no file. `--retire` writes all versions of the prompt to `retired.json`. Then it deletes the prompt in Langfuse. You cannot undo a deletion. Thus, the command runs only when `ALLOW_PROMPT_DELETE=1` is set.

### LLM-as-a-judge prompts

The application code does not load the files in `llm-as-a-judge/`. The evaluations run as **evaluators that Langfuse manages** (Evaluation → Evaluators in the UI). Trace observations start them. This service does not start them.

The local files are the version-controlled source of the evaluator prompts. To change an evaluator, edit the file here. Then paste the new text into the evaluator in the Langfuse UI.

| Local file                                  | Langfuse evaluator        |
| ------------------------------------------- | ------------------------- |
| `llm-as-a-judge/intent_match.md`            | `intent_match`            |
| `llm-as-a-judge/no_hallucination.md`        | `no_hallucination`        |
| `llm-as-a-judge/faithful_summary.md`        | `faithful_summary`        |
| `llm-as-a-judge/no_irrelevant_responses.md` | `no_irrelevant_responses` |

### Cache

The Langfuse SDK keeps prompts in a cache. The default time to live is 60 seconds.
