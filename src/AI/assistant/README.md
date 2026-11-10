# Studio Assistant

Studio Assistant is an agent service that changes Altinn apps from instructions in natural language, or answers
questions about Altinn without changing the app. [Designer](../../Designer/README.md) forwards its users' requests to
it. The assistant clones and pushes app repositories through the [gitea-proxy](../../gitea-proxy) with an API key
that Designer makes for each run. The [architecture guide](docs/README.md) explains how it works and how it connects
to other services.

## Prerequisites

- An Azure key for Azure OpenAI and for Claude on Azure AI Foundry. An OpenAI key works instead of Azure.
- Optional: a Langfuse project. Without Langfuse, the assistant records no traces and uses the local prompt files in
  [agents/prompts/](agents/prompts/README.md).
- The local Designer stack, since the assistant clones and pushes through its gitea-proxy.

## Run

[`.env.example`](.env.example) lists the configuration with defaults. To run in Docker, copy it to `.env.docker`, add
your keys and run `docker compose up`. The container joins Designer's `designer_default` network, so start the
Designer stack first.

To run with Python, install [uv](https://docs.astral.sh/uv/), copy `.env.example` to `.env` and add your keys:

```bash
uv sync
source .venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8071 --reload
```

## Checks

`uv sync` also installs the development tools. CI runs these in
[altinity-build-test.yaml](../../../.github/workflows/altinity-build-test.yaml), then starts the server and checks
`/health`:

```bash
ruff check .
ruff format --check .
pyright
python -m pytest
```

The [benchmark workbench](benchmarks/EVALS.md) measures what a change does to the agent's output.
