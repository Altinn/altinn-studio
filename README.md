# Altinity MCP Server

A MCP (Model Context Protocol) server providing specialized AI-powered tools for Altinn Studio application development. This server enables AI assistants to help developers build, configure, and validate Altinn applications through a comprehensive set of domain-specific tools.

## Tool Architecture

The following diagram groups the available tools by category for easier navigation:

<p align="center">
  <img src="assets/images/tool-clusters-diagram.png" alt="Altinity MCP Tool Clusters" width="600">
</p>

## Features

### Core Development Tools

- **Layout Components Tool** - Search and discover Altinn UI components with AI-powered relevance matching
- **Layout Properties Tool** - Get detailed schema information for component types
- **Schema Validator Tool** - Validate layout JSON against Altinn Studio schemas
- **Datamodel Tool** - Comprehensive documentation for Altinn data models and schemas
- **Datamodel Sync Tool** - Generate XSD and C# files from JSON schema (replicates Altinn Studio logic)
- **Resource Tool** - Implementation guides for text resources and translations
- **Resource Validator Tool** - Validate text resource JSON files with schema and business rules

### Logic & Code Generation

- **Studio Examples Tool** - Fetch example C# logic from existing Altinn Studio applications
- **App Library Examples Tool** - Access core C# files from the Altinn App library
- **Dynamic Expression Tool** - Documentation and guides for dynamic expressions

### Policy & Authorization

- **Policy Tool** - Authorization rules and access control context for policy.xml
- **Policy Summarization Tool** - Generate readable summaries of policy.xml files
- **Policy Validation Tool** - Validate authorization rules against requirements

### Configuration & Setup

- **Prefill Tool** - Data prefilling implementation guides
- **Planning Tool** - Altinn Studio planning documentation with intelligent search
- **Server Info Tool** - MCP server version and status information

## Installation

### Recommended: Docker Setup

The easiest way to get started is using Docker, which works across all environments:

**Prerequisites:**

- Docker and Docker Compose installed

**Quick Start:**

1. Clone this repository
2. Copy `.env.example` to `.env` and add your API keys:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your keys:

   ```env
   # LLM API Keys (required for some tools)
   AZURE_API_KEY=your_azure_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here  # Optional: Azure is used by default

   # Gitea Access Token (required for repository scanning tools)
   GITEA_API_KEY=your_gitea_api_key_here
   ```

4. Start the server:
   ```bash
   docker-compose up
   ```

The server will be available on port 8069 and automatically handle all dependencies.

### Alternative: Local Python Setup

If you prefer running without Docker:

**Prerequisites:**

- Python 3.12 or higher
- `uv` package manager (recommended) or `pip`

**Install Dependencies:**

Using `uv` (recommended):

```bash
uv pip install -e .
```

Or using `pip`:

```bash
pip install -e .
```

**Configuration:**

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your API keys (same as Docker setup above)

## Getting Started

### Important: First-Time Setup

**The MCP server indexes Altinn documentation on startup, which can cause issues when running directly in MCP clients.** Follow this two-step process:

#### Step 1: Initialize Documentation Index

Run the server once to build the documentation cache:

**Using Docker (recommended):**

```bash
docker-compose up
```

**Using Python directly:**

```bash
uv run -m server.main
```

This will:

- Download and index all Altinn Studio documentation (~30-60 seconds on first run)
- Cache the documentation for future use
- Verify the server starts correctly

You'll see progress messages like:

```
================================================================================
Initializing documentation search (fetching all docs)...
This may take 30-60 seconds on first run, but uses cache on subsequent starts.
================================================================================
✅ Documentation search initialized and ready!
================================================================================
```

Press `Ctrl+C` to stop the server after initialization completes.

#### Step 2: Configure MCP Client

Choose the configuration method based on how you're running the server:

##### Option A: Running with Docker (Recommended)

When using Docker, the server runs as an HTTP/SSE service. Configure your MCP client to connect to `http://localhost:8069/sse`:

**Cursor** (`~/.cursor/config.json`):

```json
{
  "mcpServers": {
    "altinity-mcp": {
      "url": "http://localhost:8069/sse"
    }
  }
}
```

**VS Code** (`settings.json`):

```json
{
  "mcpServers": {
    "altinity-mcp": {
      "type": "http",
      "url": "http://localhost:8069/sse"
    }
  }
}
```

**Windsurf** (`~/.config/windsurf/config.json`):

```json
{
  "mcpServers": {
    "altinity-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:8069/sse"]
    }
  }
}
```

**Claude Code** (command line):

```bash
claude mcp add --scope project --transport http altinity-mcp "http://localhost:8069/sse"
```

Or manually in config:

```json
{
  "mcpServers": {
    "altinity-mcp": {
      "type": "http",
      "url": "http://localhost:8069/sse"
    }
  }
}
```

##### Option B: Running with Python Directly

When running the server directly with Python, use stdio transport and let the MCP client spawn the server:

**Windsurf/Claude Desktop** (`~/.config/windsurf/config.json` or `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "altinity-mcp": {
      "command": "uv",
      "args": ["run", "-m", "server.main", "--stdio", "--skip-doc-init"],
      "cwd": "/path/to/altinity-mcp"
    }
  }
}
```

**Key Points:**

- **Docker**: Server runs independently, clients connect via HTTP
- **Python**: Client spawns the server using stdio, use `--skip-doc-init` flag
- Replace `/path/to/altinity-mcp` with the actual path to your installation

## Usage

### Running the Server

#### Recommended: Using Docker

```bash
docker-compose up
```

This is the easiest and most reliable way to run the server across all environments. The server will be available on port 8069 with all dependencies handled automatically.

#### Alternative Options

**Option 1: Using the launcher script**

```bash
python initiate_mcp.py
```

This will open a new terminal window and start the MCP server.

**Option 2: Running directly with Python**

```bash
# Default SSE transport on port 8069
uv run -m server.main

# Custom port
uv run -m server.main --port 8080

# Using stdio transport
uv run -m server.main --stdio
```

### Running in MCP Clients

**Using Docker:**

1. Start the server first: `docker-compose up`
2. The server will run on `http://localhost:8069/sse`
3. Configure your MCP client to connect to this URL (see Step 2 above)
4. Restart your MCP client - it will connect to the running server

**Using Python directly:**

- After configuring with stdio transport (Step 2, Option B above)
- Simply restart your MCP client - it will automatically spawn the server

### Command-Line Options

- `--stdio` - Use stdio transport (required for MCP clients)
- `--skip-doc-init` - Skip documentation initialization, use cached data (recommended for MCP clients)
- `--port <number>` - Custom port for SSE transport (default: 8069)

## Tool Usage Examples

### Getting Documentation

```python
# Get datamodel documentation (call once per session)
datamodel_tool()

# Get policy documentation
policy_tool()

# Search planning documentation
planning_tool(query="how to create a new app")
```

### Finding Components

```python
# Find relevant UI components
layout_components_tool(query="date picker with validation")

# Get component properties
layout_properties_tool(component_type="Input")
```

### Validation

```python
# Validate layout JSON
schema_validator_tool(json_obj="...", schema_path="...")

# Validate text resources
resource_validator_tool(resource_json="...", language="nb")

# Validate policy rules
policy_validation_tool(query="...", policy_rules={...})
```

### Code Examples

```python
# Get C# examples from Altinn Studio apps
studio_examples_tool(query="validation logic")

# Get C# examples from Altinn App library
app_lib_examples_tool(query="custom instantiation")
```

## Troubleshooting

### MCP Client Connection Issues

**For Docker setup:**

- Ensure the Docker container is running: `docker ps | grep altinity`
- Verify the server is accessible: `curl http://localhost:8069/sse`
- Check your MCP client configuration uses the correct URL: `http://localhost:8069/sse`
- Confirm the server completed documentation indexing (check Docker logs: `docker-compose logs`)

**For Python setup:**

- Ensure you ran the server first to build the documentation cache: `uv run -m server.main`
- Verify `--skip-doc-init` flag is in your MCP client configuration
- Check that `--stdio` flag is present in the client config
- Confirm the `cwd` path points to your altinity-mcp installation

### Documentation Not Loading

- Rebuild the documentation cache:
  - **Docker**: `docker-compose up` (documentation will rebuild automatically)
  - **Python**: `uv run -m server.main`
- Check your internet connection (required for initial documentation fetch)
- Verify the cache directory has write permissions

### Docker Issues

- Ensure Docker and Docker Compose are installed and running
- Check that port 8069 is not already in use: `lsof -i :8069`
- Verify `.env` file exists and contains valid API keys
- Check Docker logs: `docker-compose logs`

### Missing API Keys

- Some tools require Azure/OpenAI API keys (check `.env` file)
- Repository scanning tools require a Gitea API token
- Keys can be set in `.env` file or MCP client configuration

## Development

This is a focused version of the Altinity project containing only the MCP server components. For the full Altinity ecosystem including the FastAgent system, please refer to the main Altinity repository.

### Project Structure

```
altinity-mcp/
├── server/
│   ├── main.py              # Entry point and server initialization
│   ├── tools/               # MCP tool implementations
│   │   ├── __init__.py      # Tool registry and MCP configuration
│   │   ├── datamodel_tool/
│   │   ├── layout_components_tool/
│   │   ├── policy_tool/
│   │   └── ...
└── pyproject.toml           # Project dependencies and metadata
```

### Adding New Tools

1. Create a new tool directory under `server/tools/`
2. Implement your tool function using the `@register_tool` decorator
3. Import your tool in `server/tools/__init__.py`
4. Import your tool in `server/main.py`

## Version

Current version: **1.0.5**
