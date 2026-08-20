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

Runs the same agentic loop **read-only** (write tools are denied): the model answers using the repo scan, documentation skills, and schema-lookup tools without modifying files.

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
│   ├── prompts/          # System + user prompts (+ loader)
│   ├── services/         # git, llm, events, validation, repo, patching, telemetry
│   └── workflows/        # Up-front pipeline stages (intake, spec)
└── shared/               # Config, models, utilities
```

## Dependencies

- FastAPI
- LangGraph
- LangChain
- Langfuse
