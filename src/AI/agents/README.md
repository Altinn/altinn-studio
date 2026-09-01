# Altinity: AI Agent for Altinn Studio

An AI agent that modifies Altinn Studio applications through natural language instructions.

## What is Altinity?

Altinity is a multi-agent system powered by LangGraph that understands Altinn Studio development patterns. It can autonomously generate, validate, and apply code changes to your applications - or answer questions about Altinn concepts without making changes.

## Prerequisites

- Azure OpenAI API access (or OpenAI)

## Quick Start

### Docker (Recommended)

```bash
# 1. Clone and configure
cp .env.example .env.docker
# Edit .env.docker with your API keys

# 2. Start Altinity
docker-compose up
```

### Local Python

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure
cp .env.example .env
# Edit .env with your API keys

# 3. Start Altinity
python -m uvicorn api.main:app --host 0.0.0.0 --port 8071 --reload
```

## Features

- 🤖 **Code Generation** - Generates Altinn-compliant code using in-process Altinn tools
- 💬 **Chat Mode** - Ask questions without making changes
- ✅ **Validation** - Schema and business rule validation
- 🔄 **Atomic Operations** - All-or-nothing changes with rollback
- 🌲 **Git Integration** - Session-based branches for change tracking
- 📊 **Observability** - Langfuse integration for tracing and cost monitoring

## API

### Start Workflow

```bash
POST /api/agent/start
Content-Type: application/json

{
  "session_id": "unique-session-id",
  "repo_url": "http://gitea:3000/org/app.git",
  "goal": "Add a date field for 'birthDate' after the name field",
  "allow_app_changes": true
}
```

**Parameters:**

- `session_id` - Unique identifier for this session
- `repo_url` - Git URL of the Altinn app repository
- `goal` - Natural language description of what to do
- `allow_app_changes` - `true` for workflow mode, `false` for chat mode

### Chat Mode (Q&A)

```json
{
  "session_id": "unique-session-id",
  "repo_url": "http://gitea:3000/org/app.git",
  "goal": "How do I use dynamic expressions to hide fields?",
  "allow_app_changes": false
}
```

### Check Session Status

```bash
GET /api/agent/status/{session_id}
```

Returns session status for reconnection scenarios.

### Other Endpoints

| Method | Endpoint  | Description                    |
| ------ | --------- | ------------------------------ |
| `GET`  | `/health` | Health check                   |
| `WS`   | `/ws`     | WebSocket for real-time events |

## WebSocket Events

Connect to receive real-time workflow updates:

```javascript
const ws = new WebSocket('ws://localhost:8071/ws');

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: 'session',
      session_id: 'your-session-id',
    }),
  );
};

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);

  switch (type) {
    case 'status':
      // Workflow progress update
      break;
    case 'assistant_message':
      // Final response from agent
      break;
    case 'done':
      // Workflow completed
      break;
    case 'error':
      // Error occurred
      break;
  }
};
```

## Configuration

```env
# Required: Azure OpenAI
AZURE_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/

# Required: Gitea for branch pushes
GITEA_LOCAL_TOKEN=your-token
GITEA_BASE_URL=http://localhost:3000

# Optional: Multi-model setup
LLM_MODEL_PLANNER=gpt-4o
LLM_MODEL_ACTOR=claude-sonnet-4-5
LLM_MODEL_REVIEWER=gpt-4o-mini

# Optional: Langfuse observability
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_ENABLED=true
```

## How It Works

Every request first passes **pre-graph gates** — intent parsing and a scope check that decline anything outside Altinn app development. It then runs a small LangGraph: **intake → [spec] → agentic loop**.

### Workflow Mode (`allow_app_changes: true`)

1. **Intake** - Validates the goal and parses it into a change request.
2. **Spec** (only when files are attached) - Extracts a structured FormSpec from the uploads.
3. **Agentic loop** - A single model-driven loop does the work by calling tools: scan the repo, read/edit/write files, look up layout and datamodel schemas, load domain-knowledge skills, verify changes, and commit to a session branch. The model chooses the order.

Changes are atomic: the loop commits a working change to the session branch or rolls back.

### Chat Mode (`allow_app_changes: false`)

Runs the same agentic loop **read-only**: write tools are denied, so the model answers using the repo scan, documentation skills, and schema-lookup tools without modifying files. The denial is escalatable, so if the request genuinely needs a change, the first write-tool call prompts the user; granting it turns the session into a normal write session.

## Security model

Three layers, each covering what the others cannot.

**Intent gate** (`intent_security.md`, write mode only) screens the user's goal text for abuse before the graph runs. It sees attachment _filenames_, never their bytes: a 13k-token PDF costs real money to screen and yields little signal.

**Structural containment** (both modes) is the boundary that actually holds. Write tools are denied in read-only mode until the user approves an escalation, file access is confined to the app repository, `web_fetch` is allowlisted to Digdir hosts, and every change the agent makes to a repository lands on a session branch a human reviews before merge. That covers repository changes only: publishing a prompt with `scripts/sync_prompts.py --push` reaches the deployed service immediately, with no branch and no review (see [Prompts and Langfuse](#prompts-and-langfuse)).

**Spotlighting** (both modes) covers what the intent gate never sees: the content of uploaded documents. Users attach PDFs and images as context, and that content reaches the model twice: once as the attachment the spec extractor reads, and again as the extracted `FormSpec` in the loop's system prompt. Both are wrapped in `<attachment_content>` / `<form_spec>` delimiters carrying an explicit instruction that the block is data to describe, not instructions to obey. A closing tag written inside the content is escaped so a document cannot end its own block early.

The delimiters are composed in `shared/utils/spotlight.py` and applied in code (`llm_client.py` for the attachment, `core/context.py` for the form spec). This is deliberate: Langfuse serves the system prompts in every configured environment, so a control that lives only in a prompt file is inert the moment a managed version exists. Prompt-file wording reinforces the control; it does not implement it.

## Prompts and Langfuse

The files in `agents/prompts/` are a **fallback**, not the source of truth. When Langfuse is configured, `get_prompt_with_langfuse` serves the version labeled `production` and the local file is never read. The two drift, quietly: a prompt edited in the Langfuse UI is invisible in a code review, and a prompt edited in the repo has no effect until someone publishes it.

`scripts/sync_prompts.py` makes that visible and fixable.

```bash
python -m scripts.sync_prompts --diff                    # every prompt, repo vs Langfuse
python -m scripts.sync_prompts --diff spec_extraction    # just one
python -m scripts.sync_prompts --push spec_extraction -m "why this changed"
python -m scripts.sync_prompts --promote spec_extraction --version 1   # roll back
```

`--push` publishes the local file as a new version labeled `production`, so **the deployed service picks it up immediately**. Roll back by promoting the previous version.

Run `--diff` before editing any prompt, and after merging a PR that touches one. At the time of writing 11 of 17 prompts differ from their repo copies, so treat a diff as expected rather than alarming, and read it before pushing: the local file may be behind, not ahead.

This is also why the attachment spotlighting above is implemented in code. A security control that lives only in a prompt file is inert the moment a managed version exists.

## Project Structure

```
altinity-agents/
├── api/                  # FastAPI server
│   ├── routes/           # Endpoints: agent, websocket, token_usage, traces
│   └── main.py           # Application entry point
├── agents/
│   ├── graph/            # LangGraph: intake → [spec] → agentic_loop
│   │   ├── nodes/        # intake_node, spec_node, agentic_loop_node
│   │   ├── runner.py     # Graph build + pre-graph gates
│   │   └── state.py      # AgentState
│   ├── core/             # Agentic loop engine (loop, tool registry, skills, tools/)
│   ├── altinn/           # Altinn domain library (datamodel, layout, policy, resources)
│   ├── skills/           # Domain-knowledge skills, loaded on demand
│   ├── prompts/          # System + user prompts (+ loader; Langfuse overrides these)
│   ├── services/         # git, llm, events, validation, repo, patching, telemetry
│   └── workflows/        # Up-front pipeline stages (intake, spec)
└── shared/               # Config, models, utilities
```

## Dependencies

- FastAPI
- LangGraph
- LangChain
- Langfuse
