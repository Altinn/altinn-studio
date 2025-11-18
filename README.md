# Altinity: AI Agent System for Altinn Studio Apps

An intelligent AI agent system that makes sophisticated code changes to Altinn Studio applications through natural language instructions.

**Altinity** is a multi-agent system powered by LangGraph that understands Altinn Studio development patterns and can autonomously generate, validate, and apply code changes to your applications. It includes full Altinn app preview functionality and uses specialized AI agents working together to handle the complexity of Altinn Studio development while maintaining safety and reliability.

## Prerequisites

- Python 3.11+
- Git
- Azure OpenAI or OpenAI API access
- **[Altinity MCP Server](https://github.com/Simenwai/altinity-mcp)** running in the background

## Quick Start

1. **Install dependencies:**

```bash
pip install -r requirements.txt
```

2. **Configure environment:**

```bash
cp .env.example .env
# Edit .env with your API keys and paths
```

3. **Start the Altinity MCP Server** (required background service):

```bash
# In a separate terminal, follow instructions at:
# https://github.com/Simenwai/altinity-mcp
```

4. **Start Altinity:**

```bash
python -m uvicorn frontend_api.main:app --host 0.0.0.0 --port 8071 --reload
```

## Features

- 🤖 **Intelligent Code Generation** - Generates Altinn-compliant code using specialized MCP tools
- 🔍 **Semantic Documentation Search** - Finds relevant Altinn documentation automatically
- 💬 **Chat Mode** - Ask questions about Altinn or your app without making changes
- ✅ **Multi-Layer Validation** - Schema, business rules, and contract validation
- 🔄 **Atomic Operations** - All-or-nothing changes with automatic rollback
- 🌲 **Git Integration** - Session-based branches for clean change tracking
- 📊 **Full Observability** - Langfuse integration for LLM call tracing and cost monitoring
- 🔒 **Safety First** - Intent validation, dangerous keyword blocking, and comprehensive checks
- 🌐 **Real-time Updates** - WebSocket support for live workflow progress
- 🎯 **Context-Aware** - Scans your repository to understand existing structure

## How It Works

Altinity operates in two modes:

### **Workflow Mode** (Default)

Makes actual changes to your Altinn application through a **modular 7-stage LangGraph workflow**:

1. **Intake** (`agents/workflows/intake/`) - Parses user goals and validates safety/intent
2. **Repository Scan** - Discovers project structure and existing components
3. **Planning Tool** (`agents/graph/nodes/planning_tool_node.py`) - Retrieves relevant Altinn documentation using semantic search
4. **Planner** (`agents/graph/nodes/planner_node.py`) - Creates detailed implementation plans with tool selection
5. **Actor** (`agents/workflows/actor/`) - Generates precise code changes using MCP tools and applies them
6. **Verifier** (`agents/workflows/verifier/`) - Validates changes through MCP verification tools and contract checking
7. **Reviewer** (`agents/workflows/reviewer/`) - Runs final tests and commits changes to session-based git branches

Each stage delegates to focused workflow modules under `agents/workflows/` for maintainable, testable code.

**Git Workflow:** Each session creates a dedicated feature branch (e.g., `altinity_session_abc12345`) where all changes for that session are committed. This ensures clean separation between different user requests while maintaining atomic commits.

All operations are **atomic** - either all changes succeed or everything is rolled back.

### **Chat Mode**

Answer questions about Altinn concepts or your application without making changes. Set `"allow_app_changes": false` in your API request to enable chat mode. The system will:

- Scan your repository for context
- Select relevant MCP tools based on your question
- Generate natural language responses with documentation and examples
- Return information without modifying any files

## API Reference

### Start Agent Workflow

```bash
POST /api/agent/start
```

**Workflow Mode Request (makes changes):**

```json
{
  "session_id": "unique-session-id",
  "goal": "Add a numeric field 'totalWeight' to layout main bound to model.calculation.weight",
  "allow_app_changes": true
}
```

**Chat Mode Request (Q&A only, no changes):**

```json
{
  "session_id": "unique-session-id",
  "goal": "How do I use dynamic expressions to hide fields?",
  "allow_app_changes": false
}
```

**Response (Success):**

```json
{
  "accepted": true,
  "session_id": "unique-session-id",
  "message": "Agent workflow started",
  "app_name": "MyAltinnApp",
  "parsed_intent": {
    "action": "add",
    "component": "field",
    "target": "totalWeight",
    "confidence": 0.85,
    "details": "numeric input field with validation"
  }
}
```

**Response (Rejected - Unsafe):**

```json
{
  "detail": {
    "message": "Goal rejected: Contains potentially dangerous keyword: delete",
    "suggestions": ["Add a text field 'customerName' to layout main", "Modify the existing 'amount' field validation"]
  }
}
```

**Response (Rejected - Unclear):**

```json
{
  "detail": {
    "message": "Goal is too unclear or ambiguous",
    "suggestions": [
      "Add a numeric field 'totalAmount' bound to model.amount",
      "Add validation to the existing amount field"
    ]
  }
}
```

### Other Endpoints

| Method | Endpoint              | Description                    |
| ------ | --------------------- | ------------------------------ |
| `GET`  | `/apps/list`          | List available Altinn apps     |
| `POST` | `/apps/select`        | Select an app for operations   |
| `GET`  | `/api/files`          | List files in current app      |
| `GET`  | `/api/files/content`  | Get file content               |
| `GET`  | `/api/git/status`     | Get git status                 |
| `POST` | `/api/git/commit`     | Create commit                  |
| `GET`  | `/apps/{app}/preview` | Preview Altinn app in browser  |
| `GET`  | `/health`             | Health check                   |
| `WS`   | `/ws`                 | WebSocket for real-time events |

## Frontend Integration

Connect your frontend to receive real-time updates during agent workflow execution:

```javascript
// WebSocket connection
const ws = new WebSocket('ws://localhost:8071/ws');

// Register for events from your workflow session
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: 'session',
      session_id: 'your-session-id',
    })
  );
};

// Handle workflow events
ws.onmessage = (event) => {
  const agentEvent = JSON.parse(event.data);

  switch (agentEvent.type) {
    case 'plan_proposed':
      // Show the agent's implementation plan
      displayPlan(agentEvent.data.plan);
      break;

    case 'patch_preview':
      // Show what files will be changed
      showChanges({
        files: agentEvent.data.files,
        changes: agentEvent.data.changes,
      });
      break;

    case 'verified':
      // Show verification results
      showVerification({
        passed: agentEvent.data.passed,
        issues: agentEvent.data.issues,
      });
      break;

    case 'commit_done':
      // Changes were successfully committed
      showSuccess({
        branch: agentEvent.data.branch,
        commit: agentEvent.data.commit,
        reasoning: agentEvent.data.reasoning,
      });
      break;

    case 'reverted':
      // Changes were rolled back
      showRollback(agentEvent.data.reason);
      break;

    case 'status':
      // Final workflow status
      handleComplete({
        success: agentEvent.data.success,
        status: agentEvent.data.status,
        message: agentEvent.data.message,
      });
      break;
  }
};
```

## Configuration

Key settings in your `.env` file:

```env
# Required: LLM Configuration
AZURE_OPENAI_ENDPOINT=your-endpoint
AZURE_OPENAI_API_KEY=your-key

# Required: App Path (absolute path to your apps directory)
ALTINN_STUDIO_APPS_PATH=/path/to/your/apps

# Optional: Multi-model setup for optimal performance
LLM_MODEL_PLANNER=gpt-4o          # Complex reasoning
LLM_MODEL_ACTOR=gpt-4o-mini-2M-tps # Fast code generation
LLM_MODEL_REVIEWER=gpt-4o-mini-2M-tps
LLM_MODEL_VERIFIER=gpt-4o-mini-2M-tps

# Langfuse Observability (Optional but Recommended)
LANGFUSE_SECRET_KEY=sk-lf-...      # Get from https://cloud.langfuse.com
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_ENABLED=true              # Set to false to disable tracing
```

## Safety Features

- **Intent Validation** - Dangerous keywords are blocked before processing with contextual suggestions
- **Multi-layer Verification** - Syntax, business rules, contract validation, and MCP-based verification tools
- **Branch Safety** - Prevents accidental commits to master/main branches with session-based feature branches
- **Automatic Rollback** - Failed changes are automatically reverted with detailed error reporting
- **Atomic Operations** - All-or-nothing approach to changes with comprehensive validation
- **Git Integration** - All changes tracked with session-based branches and reversible commits
- **MCP Verification** - Real-time validation using Altinn Studio-specific tools

## Observability

Altinity uses **[Langfuse](https://langfuse.com)** for comprehensive LLM observability and tracing:

- **Trace Visualization** - See the complete execution flow of each workflow
- **Token Tracking** - Automatic cost calculation and usage monitoring
- **Performance Metrics** - Track latency and identify bottlenecks
- **LLM Call Inspection** - View prompts, responses, and model parameters
- **Session Grouping** - All operations for a user request grouped together
- **Cloud or Self-Hosted** - Use Langfuse Cloud or deploy your own instance

**Getting Started:**

1. Sign up at [cloud.langfuse.com](https://cloud.langfuse.com) (free tier available)
2. Get your API keys from project settings
3. Add them to your `.env` file
4. View traces in real-time as workflows execute

See `LANGFUSE_SETUP.md` for detailed setup instructions including self-hosted deployment.

## Dependencies

The system requires the **[Altinity MCP Server](https://github.com/Simenwai/altinity-mcp)** to be running as a background service. This provides Altinn Studio-specific tools and knowledge that the AI agents use to generate proper code changes.

**Core Dependencies:**

- FastAPI - Web framework
- LangGraph - Agent workflow orchestration
- LangChain - LLM integration
- Langfuse - LLM observability and tracing
- GitPython - Git operations
- MCP Client - Altinn Studio tool integration

## Project Structure

```
altinity-agents/
├── frontend_api/           # FastAPI web server
│   ├── routes/            # API endpoints
│   └── main.py           # Application entry point
├── agents/               # AI agent system
│   ├── graph/            # LangGraph workflow nodes
│   │   ├── nodes/        # Individual workflow nodes
│   │   └── runner.py     # Workflow orchestration
│   ├── services/         # Modular service architecture
│   │   ├── mcp/          # MCP client & verification tools
│   │   ├── git/          # Git operations & safety
│   │   ├── repo/         # Repository scanning & anchor resolution
│   │   ├── patching/     # Patch validation & normalization
│   │   ├── validation/   # Contract & runtime validation
│   │   ├── llm/          # LLM client & intent parsing
│   │   ├── events/       # Event handling & job management
│   │   └── telemetry/    # Langfuse observability
│   └── workflows/        # Pipeline-based workflow stages
│       ├── intake/       # Goal parsing & safety validation
│       ├── actor/        # Code generation pipeline
│       ├── verifier/     # Multi-layer validation pipeline
│       ├── reviewer/     # Final testing & commit pipeline
│       └── shared/       # Cross-workflow utilities
└── shared/              # Common utilities
    ├── config/          # Configuration management
    ├── models/          # Data models
    └── utils/           # Logging, utilities
```
