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

### Prerequisites

- Python 3.12 or higher
- `uv` package manager (recommended) or `pip`

### Install Dependencies

Using `uv` (recommended):

```bash
uv pip install -e .
```

Or using `pip`:

```bash
pip install -e .
```

## Configuration

### Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` with your API keys:

```env
# LLM API Keys (required for some tools)
AZURE_API_KEY=your_azure_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Optional: Azure is used by default

# Gitea Access Token (required for repository scanning tools)
GITEA_API_KEY=your_gitea_api_key_here
```

## Getting Started

### Important: First-Time Setup

**The MCP server indexes Altinn documentation on startup, which can cause issues when running directly in MCP clients.** Follow this two-step process:

#### Step 1: Initialize Documentation Index

Run the server once in your terminal to build the documentation cache:

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

Now configure your MCP client (e.g., Windsurf, Claude Desktop) to use the `--skip-doc-init` flag.

Add the following to your MCP client configuration file:

- **Windsurf**: `~/.config/windsurf/config.json`
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

- Always use `--stdio` when running in MCP clients
- Always use `--skip-doc-init` to skip documentation indexing (uses cached data)
- Replace `/path/to/altinity-mcp` with the actual path to your installation
- Add your API keys to the `env` section

## Usage

### Running in Terminal (Testing)

For testing and documentation initialization, you have several options:

**Option 1: Using the launcher script**

```bash
python initiate_mcp.py
```

This will open a new terminal window and start the MCP server.

**Option 2: Running directly**

```bash
# Default SSE transport on port 8069
uv run -m server.main

# Custom port
uv run -m server.main --port 8080

# Using stdio transport
uv run -m server.main --stdio
```

**Option 3: Using Docker**

```bash
docker-compose up
```

### Running in MCP Clients

After completing the first-time setup above, simply restart your MCP client (Windsurf, Claude Desktop, etc.). The server will automatically start when the client launches.

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

- Ensure you ran the server in terminal first to build the documentation cache
- Verify `--skip-doc-init` flag is in your MCP client configuration
- Check that `--stdio` flag is present for MCP clients
- Confirm the `cwd` path points to your altinity-mcp installation

### Documentation Not Loading

- Run `uv run -m server.main` in terminal to rebuild the documentation cache
- Check your internet connection (required for initial documentation fetch)
- Verify the cache directory has write permissions

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
