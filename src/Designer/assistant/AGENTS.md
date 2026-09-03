# AGENTS.md — Studio assistant (`src/Designer/assistant`)

The natural-language app-building agent behind the Studio assistant panel in
[`frontend`](../frontend/AGENTS.md): a FastAPI service that plans and applies changes to a user's Altinn
app repository through an LLM agent loop. The [`backend`](../backend/AGENTS.md) opens a raw WebSocket to
this service's `/ws` and forwards the event frames it receives to the frontend over SignalR. See
[`README.md`](README.md) for the full architecture, API, and security model.

## Stack

- Python >=3.12, managed with `uv` (`pyproject.toml` + `uv.lock`)
- FastAPI + `uvicorn`, WebSocket for real-time events
- LangGraph for the agent loop, Langfuse for prompt management and tracing
- pytest, pytest-asyncio, pytest-mock for tests

## Project structure

```
api/                  # FastAPI server: main.py entrypoint + routes (agent, websocket, token_usage, traces)
agents/               # The agent itself
├── graph/            # LangGraph: intake → [spec] → agentic_loop
├── core/             # Agentic loop engine (loop, tool registry, skills, tools/)
├── altinn/           # Altinn domain library (datamodel, layout, policy, resources)
├── skills/           # Domain-knowledge skills (altinn-*), loaded on demand — see skills/README.md
├── prompts/          # System + user prompts + loader; Langfuse overrides these in deployed environments
├── services/         # Agent runtime services: events, git, llm, preview, repo, telemetry, validation
└── workflows/        # Up-front pipeline stages (intake, spec)
services/             # Langfuse-backed operational jobs served by api/routes: token_usage, traces.
                      # A separate package from agents/services above — mind which one you are importing.
shared/               # Config, models, utilities
tests/                # unit/, api/, services/, shared/ — all four run by default, see below
benchmarks/           # Langfuse dataset runs that score agent quality — see benchmarks/README.md
scripts/              # Dev scripts: prompt sync to Langfuse, injection-fixture generation
infra/kustomize/      # Kubernetes manifests for the deployed service
```

## Development commands

- `uv sync --extra dev` — install dependencies (including test tooling)
- `uv run pytest` — run the unit test suite (`tests/unit`)
- `uv run uvicorn api.main:app --host 0.0.0.0 --port 8071 --reload` — run locally
- `docker compose up` — run via the project's own compose stack (separate from Designer's
  `src/Designer/compose.yaml`; this service builds, tests, and deploys independently)
