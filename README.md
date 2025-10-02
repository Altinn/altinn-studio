# Altinity MCP

An MCP (Model Control Protocol) server with specialized tools for Altinn development. This repository contains only the MCP server components from the original Altinity project, focused on providing AI-powered tools for Altinn Studio development.

## Features

- MCP server with specialized tools for Altinn development
- Tools for working with Altinn Studio apps including:
  - Layout components tool
  - Dynamic expressions tool
  - Datamodel tool
  - Resource tool
  - Policy tool
  - Prefill tool
  - And more...

## Installation

1. Clone this repository
2. Install dependencies using `uv`:

```bash
uv pip install -e .
```

## Configuration

1. Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

2. Edit the `.env` file with your API keys and paths

## Usage

You can start the MCP server in two ways:

### Option 1: Using the launcher script

```bash
python initiate_mcp.py
```

This will open a new terminal window and start the MCP server.

### Option 2: Running directly

```bash
uv run -m server.main
```

The MCP server will start and be available for connections from MCP clients like Windsurf.

## Development

This is a focused version of the Altinity project that only includes the MCP server components. If you need the full Altinity functionality including Fast Agent, please refer to the main Altinity repository.
