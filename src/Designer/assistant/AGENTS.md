# AGENTS.md — Studio assistant (`src/Designer/assistant`)

This file provides guidance to AI agents when working with code.

The natural-language app-building agent behind the Studio assistant panel in
[`frontend`](../frontend/AGENTS.md): a FastAPI service that plans and applies changes to a user's Altinn
app repository through an LLM agent loop, over a WebSocket the frontend proxies via the
[`backend`](../backend/AGENTS.md). See [`README.md`](README.md) for the full architecture, API, and
security model — this file is the short version for working in the code.

## Stack

- Python >=3.12, managed with `uv` (`pyproject.toml` + `uv.lock`)
- FastAPI + `uvicorn`, WebSocket for real-time events
- LangGraph for the agent loop, Langfuse for prompt management and tracing
- pytest, pytest-asyncio, pytest-mock for tests

## Project structure

```
api/                  # FastAPI server: routes (agent, websocket, token_usage, traces), main.py entrypoint
agents/
├── graph/            # LangGraph: intake → [spec] → agentic_loop
├── core/             # Agentic loop engine (loop, tool registry, skills, tools/)
├── altinn/           # Altinn domain library (datamodel, layout, policy, resources)
├── skills/           # Domain-knowledge skills (altinn-*), loaded on demand — see skills/README.md
├── prompts/          # System + user prompts + loader; Langfuse overrides these in deployed environments
├── services/         # git, llm, events, validation, repo, patching, telemetry
└── workflows/        # Up-front pipeline stages (intake, spec)
shared/                # Config, models, utilities
infra/kustomize/       # Kubernetes manifests for the deployed service
```

## Development commands

- `uv sync --extra dev` — install dependencies (including test tooling)
- `uv run pytest` — run the unit test suite (`tests/unit`)
- `uv run uvicorn api.main:app --host 0.0.0.0 --port 8071 --reload` — run locally
- `docker compose up` — run via the project's own compose stack (separate from Designer's
  `src/Designer/compose.yaml`; this service builds, tests, and deploys independently)
