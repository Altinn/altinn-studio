# Altinity Agents

A restructured agentic system for Altinn app development and management, replacing the previous FastAgents implementation.

## Project Structure

```
altinity-agents/
├── frontend_api/         # API server for frontend integration
│   ├── apps/            # App management logic
│   ├── routes/          # API route handlers
│   ├── app_state.json   # App state persistence
│   └── main.py          # FastAPI application
├── agents/              # Core agentic system (TBD)
├── shared/              # Shared utilities and models
│   ├── models/         # Data models
│   ├── utils/          # Utility functions
│   └── config/         # Configuration management
├── integrations/        # External system integrations (TBD)
├── docs/               # Documentation
├── tests/              # Test suites
└── requirements.txt    # Dependencies
```

## Components

### Frontend API
The `frontend_api/` directory contains a FastAPI server that provides:
- App listing and management
- File operations
- Git integration
- WebSocket support for real-time communication
- Preview functionality for Altinn apps

### Shared Components
The `shared/` directory provides common functionality:
- **Models**: Pydantic models for data validation
- **Utils**: Logging, path management, and other utilities
- **Config**: Centralized configuration management

### Agentic System
The `agents/` directory will contain the new agentic workflow system that replaces FastAgents. Structure and implementation to be defined.

### Integrations
External system integrations (planned):
- **MCP Client**: Integration with Model Context Protocol server
- **Altinn Studio**: Gitea repository management and app fetching (currently implemented in frontend_api)

## Configuration

Configuration is managed through environment variables and the shared config system:

```bash
# Frontend API
FRONTEND_API_HOST=0.0.0.0
FRONTEND_API_PORT=8071

# Altinn Studio Integration
ALTINN_STUDIO_APPS_PATH=/path/to/apps
GITEA_API_TOKEN=your_token_here
GITEA_URL=https://altinn.studio/repos/api/v1

# External Services
MCP_SERVER_URL=http://localhost:8069

# Logging
LOG_LEVEL=INFO
DEBUG=false
```

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables in `.env` file

3. Run the frontend API:
```bash
python -m uvicorn frontend_api.main:app --host 0.0.0.0 --port 8071 --reload
```

Or alternatively:
```bash
python -m frontend_api.main
```

## API Endpoints

### Apps
- `GET /apps/list` - List available apps
- `POST /apps/select` - Select an app for operations
- `POST /apps/fetch` - Fetch app from Gitea

### Files
- `GET /api/files` - List files for current app
- `GET /api/files/content` - Get file content
- `POST /api/files/save` - Save file content

### Git
- `GET /api/git/status` - Get git status
- `POST /api/git/commit` - Create commit

### Preview
- `GET /apps/{app}/preview` - Preview app in browser

### WebSocket
- `WS /ws/{session_id}` - Real-time communication

### Status
- `GET /health` - Health check
- `GET /api/status` - System status

## Development

This project is undergoing restructuring. The current frontend API is functional, while the agentic system is being redesigned to replace the previous FastAgents implementation.

### Next Steps
1. Design and implement the new agentic workflow system
2. Define agent communication protocols
3. Integrate with MCP server
4. Implement policy and authorization management
5. Add comprehensive testing

## Dependencies

- **FastAPI**: Web framework for the frontend API
- **GitPython**: Git operations
- **httpx**: HTTP client for API calls
- **WebSockets**: Real-time communication
- **Pydantic**: Data validation
- **python-dotenv**: Environment variable management