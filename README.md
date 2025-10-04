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

## How It Works

Altinity uses a **5-node LangGraph workflow** where specialized AI agents collaborate:

1. **Intake** - Analyzes your goal and repository structure
2. **Planner** - Creates detailed implementation plan  
3. **Actor** - Generates precise code changes using MCP tools
4. **Verifier** - Validates changes for safety and correctness
5. **Reviewer** - Makes final commit/revert decision

All operations are **atomic** - either all changes succeed or everything is rolled back.

## API Reference

### Start Agent Workflow
```bash
POST /api/agent/start
```

**Request:**
```json
{
  "session_id": "unique-session-id",
  "repo_path": "/absolute/path/to/altinn/app", 
  "goal": "Add a numeric field 'totalWeight' to layout main bound to model.calculation.weight"
}
```

**Response (Success):**
```json
{
  "message": "Agent workflow started successfully",
  "session_id": "unique-session-id",
  "parsed_intent": {
    "action": "add",
    "component": "field",
    "confidence": 0.85,
    "safe": true
  }
}
```

**Response (Rejected):**
```json
{
  "detail": {
    "message": "Goal rejected: Too ambiguous",
    "suggestions": [
      "Add a text field 'customerName' to layout main",
      "Add a numeric field 'totalAmount' bound to model.amount"
    ]
  }
}
```

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apps/list` | List available Altinn apps |
| `POST` | `/apps/select` | Select an app for operations |
| `GET` | `/api/files` | List files in current app |
| `GET` | `/api/files/content` | Get file content |
| `GET` | `/api/git/status` | Get git status |
| `POST` | `/api/git/commit` | Create commit |
| `GET` | `/apps/{app}/preview` | Preview Altinn app in browser |
| `GET` | `/health` | Health check |
| `WS` | `/ws` | WebSocket for real-time events |

## Frontend Integration

Connect your frontend to receive real-time updates during agent workflow execution:

```javascript
// WebSocket connection
const ws = new WebSocket('ws://localhost:8071/ws');

// Register for events from your workflow session
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'session',
    session_id: 'your-session-id'
  }));
};

// Handle workflow events
ws.onmessage = (event) => {
  const agentEvent = JSON.parse(event.data);
  
  switch (agentEvent.type) {
    case 'plan_proposed':
      // Show the agent's plan to user
      displayPlan(agentEvent.data.step);
      break;
      
    case 'patch_preview':
      // Show what files will be changed
      showChanges({
        files: agentEvent.data.files,
        diff: agentEvent.data.diff
      });
      break;
      
    case 'verified':
      // Show verification results
      showVerification({
        passed: agentEvent.data.passed,
        notes: agentEvent.data.notes
      });
      break;
      
    case 'committed':
      // Changes were successfully committed
      showSuccess({
        hash: agentEvent.data.hash,
        message: agentEvent.data.commit_message
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
        status: agentEvent.data.status
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

# Optional: MLflow tracking
MLFLOW_ENABLED=true
MLFLOW_TRACKING_URI=http://localhost:5000
```

## Safety Features

- **Intent Validation** - Dangerous keywords are blocked before processing
- **Multi-layer Verification** - Syntax, business rules, and integration checks
- **Automatic Rollback** - Failed changes are automatically reverted
- **Atomic Operations** - All-or-nothing approach to changes
- **Git Integration** - All changes are tracked and reversible

## Dependencies

The system requires the **[Altinity MCP Server](https://github.com/Simenwai/altinity-mcp)** to be running as a background service. This provides Altinn Studio-specific tools and knowledge that the AI agents use to generate proper code changes.

**Core Dependencies:**
- FastAPI - Web framework
- LangGraph - Agent workflow orchestration
- LangChain - LLM integration
- MLflow - Observability and tracking
- GitPython - Git operations

## Project Structure

```
altinity-agents/
├── frontend_api/           # FastAPI web server
│   ├── routes/            # API endpoints
│   └── main.py           # Application entry point
├── agents/               # AI agent system
│   ├── graph/            # LangGraph workflow
│   ├── services/         # Core services (LLM, MCP, Git)
│   └── system_prompts/   # Agent instructions
└── shared/              # Common utilities
    ├── config/          # Configuration management
    ├── models/          # Data models
    └── utils/           # Logging, MLflow, utilities
```
