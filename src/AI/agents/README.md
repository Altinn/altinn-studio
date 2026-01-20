# Altinity: AI Agent for Altinn Studio

An AI agent that modifies Altinn Studio applications through natural language instructions.

## What is Altinity?

Altinity is a multi-agent system powered by LangGraph that understands Altinn Studio development patterns. It can autonomously generate, validate, and apply code changes to your applications - or answer questions about Altinn concepts without making changes.

## Prerequisites

- Azure OpenAI API access (or OpenAI)
- **[Altinity MCP Server](https://github.com/Simenwai/altinity-mcp)** running

## Quick Start

### Docker (Recommended)

```bash
# 1. Clone and configure
cp .env.example .env.docker
# Edit .env.docker with your API keys

# 2. Start MCP server (separate terminal)
# See: https://github.com/Simenwai/altinity-mcp

# 3. Start Altinity
docker-compose up
```

### Local Python

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure
cp .env.example .env
# Edit .env with your API keys

# 3. Start MCP server (separate terminal)
# See: https://github.com/Simenwai/altinity-mcp

# 4. Start Altinity
python -m uvicorn api.main:app --host 0.0.0.0 --port 8071 --reload
```

## Features

- 🤖 **Code Generation** - Generates Altinn-compliant code using MCP tools
- 💬 **Chat Mode** - Ask questions without making changes
- ✅ **Validation** - Schema and business rule validation via MCP
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

# Required: MCP Server
MCP_SERVER_URL=http://localhost:8069/sse

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

### Workflow Mode

1. **Intake** - Validates goal safety and parses intent
2. **Repository Scan** - Discovers project structure
3. **Planning** - Retrieves Altinn documentation, plans tool usage
4. **Actor** - Generates code changes using MCP tools
5. **Verifier** - Validates changes via MCP verification tools
6. **Reviewer** - Commits to session branch or rolls back

All operations are atomic - changes either fully succeed or are rolled back.

### Chat Mode

Answers questions using MCP tools without modifying files. Scans your repository for context and generates responses with documentation examples.

## Project Structure

```
altinity-agents/
├── api/                  # FastAPI server
│   ├── routes/           # API endpoints (agent, websocket)
│   └── main.py           # Application entry point
├── agents/
│   ├── graph/            # LangGraph workflow
│   │   ├── nodes/        # Workflow nodes (intake, planner, actor, verifier, reviewer)
│   │   └── runner.py     # Workflow orchestration
│   ├── services/         # Core services
│   │   ├── mcp/          # MCP client & verification
│   │   ├── git/          # Git operations
│   │   ├── llm/          # LLM client
│   │   └── events/       # Event handling
│   └── workflows/        # Pipeline stages
└── shared/               # Config, models, utilities
```

## Dependencies

- **[Altinity MCP Server](https://github.com/Simenwai/altinity-mcp)** - Altinn-specific tools and documentation
- FastAPI, LangGraph, LangChain, Langfuse, GitPython
