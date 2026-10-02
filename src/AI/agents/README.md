# Studio Assistant: AI agent for Altinn Studio

Studio Assistant is an AI agent. It changes Altinn Studio apps from instructions in natural language.

## What Studio Assistant does

Studio Assistant knows the patterns of Altinn Studio development. The model selects the steps: it calls tools in one agentic loop. The agent can make, validate and apply code changes to your app. It can also answer questions about Altinn and not change the app.

## Prerequisites

- Access to Azure AI models: Azure OpenAI, and Claude through Azure AI Foundry (`AZURE_ANTHROPIC_ENDPOINT`). If Azure is not available, the agent can use an OpenAI key.
- Optional: a Langfuse project. The agent runs without Langfuse. Without it, the agent records no traces and uses the local prompt files.
- The local Designer stack. The agent clones and pushes through the Gitea proxy of this stack.

## Quick start

### Docker (recommended)

```bash
# 1. Make the configuration file
cp .env.example .env.docker
# Write your API keys in .env.docker

# 2. Start Studio Assistant. The Designer stack must run, because the container joins its designer_default network.
docker compose up
```

### Local Python

```bash
# 1. Install the dependencies
pip install -r requirements.txt

# 2. Make the configuration file
cp .env.example .env
# Write your API keys in .env

# 3. Start Studio Assistant
python -m uvicorn api.main:app --host 0.0.0.0 --port 8071 --reload
```

### Lint, format, type check and test

```bash
pip install -r requirements.txt -r requirements-dev.txt

ruff check .          # lint (add --fix to correct the problems)
ruff format .         # format
pyright               # type check
python -m pytest      # unit tests
```

CI runs `.github/workflows/altinity-build-test.yaml` on each pull request. This workflow runs `ruff check`, `ruff format --check`, `pyright` and `pytest`. Then it starts the server and examines `/health`.

## API

### Start a workflow

```bash
POST /api/agent/start
Content-Type: application/json
X-Api-Key: <Designer API key>
X-Developer: <developer username>

{
  "session_id": "unique-session-id",
  "repo_url": "http://gitea:3000/org/app.git",
  "org": "org",
  "goal": "Add a date field for 'birthDate' after the name field",
  "allow_app_changes": true
}
```

**Headers:**

- `X-Api-Key`: The Designer API key. The agent uses it to clone and push through the Gitea proxy. This header is necessary. Without it, the response is `401`.
- `X-Developer`: The developer who owns the session. This header is necessary. Without it, the response is `400`. There is a rate limit of 5 for each developer and 30 in total.

**Parameters:**

- `session_id`: A unique identifier for the session. Use 1 to 128 letters, digits, `-` or `_`.
- `repo_url`: The Git URL of the Altinn app repository. The agent uses only the path. The host comes from `GITEA_BASE_URL`.
- `org`: The organization that owns the app.
- `goal`: What the agent must do, in natural language.
- `allow_app_changes`: `true` for workflow mode. `false` for chat mode. The default is `false`.
- `branch`: Optional. A branch where the agent continues work.
- `attachments`: Optional. A list of files, each with `{name, mimeType, size, dataBase64}`.

### Get the session status

```bash
GET /api/agent/status/{session_id}
```

This endpoint returns the status of the session. Use it after a client connects again.

### Other endpoints

| Method   | Endpoint                             | Description                                                     |
| -------- | ------------------------------------ | --------------------------------------------------------------- |
| `POST`   | `/api/agent/permission/{session_id}` | Answer a `permission_request` with `{request_id, granted}`.     |
| `POST`   | `/api/agent/cancel/{session_id}`     | Stop a session that runs. Only the owner of the session can.    |
| `PUT`    | `/api/traces/{trace_id}/feedback`    | Record thumbs up or thumbs down as a Langfuse score.            |
| `DELETE` | `/api/traces/{trace_id}/feedback`    | Remove this feedback.                                           |
| `POST`   | `/api/traces/delete-expired`         | Delete the Langfuse traces that are older than the retention.   |
| `GET`    | `/api/token-usage/daily`             | Get the token usage for each service owner for the day before.  |
| `GET`    | `/health`                            | Examine the health. The response also gives the model per role. |
| `WS`     | `/ws`                                | WebSocket for events in real time.                              |

## WebSocket events

Connect to `ws://localhost:8071/ws`. Then send a registration message:

```json
{ "type": "session", "session_id": "your-session-id", "developer": "your-username" }
```

`developer` is necessary. Without it, the server closes the socket. After the registration, the server sends all events for the sessions of this developer. Each event has `type`, `session_id` and `data`.

| Type                      | Meaning                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| `status`                  | The workflow progress changed.                                        |
| `plan_proposed`           | Intake made a change plan.                                            |
| `assistant_message_chunk` | One part of the streamed response.                                    |
| `assistant_message`       | The final response from the agent.                                    |
| `permission_request`      | A read-only session asks for write access. Answer with `/permission`. |
| `done`                    | The workflow is complete.                                             |
| `error`                   | An error occurred.                                                    |

## Configuration

`.env.example` shows all variables and their defaults. These are the important variables:

```env
# Necessary: the Azure key. Azure OpenAI and Claude on Azure AI Foundry use it.
AZURE_API_KEY=your-key
# Optional: the endpoints have defaults in shared/config/base_config.py
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_ANTHROPIC_ENDPOINT=https://<resource>.services.ai.azure.com/anthropic/

# Necessary: the Gitea proxy for clone and push. Git uses the X-Api-Key
# header of each request, so you do not set a Gitea token here.
GITEA_BASE_URL=http://host.docker.internal/repos

# Optional: Langfuse for traces and prompt management.
# Set LANGFUSE_ENABLED=false to run without Langfuse. The default is true.
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://langfuse.digdir.cloud
LANGFUSE_ENABLED=true

# Optional: one model for each role
LLM_MODEL_PLANNER=gpt-5.6-sol
LLM_MODEL_ACTOR=gpt-5.6-terra
```

## How it works

Each request goes through **pre-graph gates** first:

- A scope check runs in the two modes. It refuses all requests that are not about Altinn app development.
- Intent parsing runs in workflow mode only.

Then a small LangGraph graph connects the three steps: **intake → [spec] → agentic loop**. The graph only sets the sequence of these steps. The agentic loop is our own code in `agents/core/loop.py`. In the loop, the model selects the tools.

### Workflow mode (`allow_app_changes: true`)

1. **Intake**: This step validates the goal. It changes the goal into a change request.
2. **Spec**: This step runs only when the request has attached files. It gets a structured FormSpec from the files.
3. **Agentic loop**: One loop does the work. The model calls tools, and the model selects their sequence. The tools can:
   - scan the repository
   - read, edit and write files
   - find the layout and data model schemas
   - load skills with domain knowledge
   - verify the changes
   - commit to a session branch.

The loop commits to the session branch with `commit_session_branch`. There is no automatic rollback. To undo a change, the model uses `discard_file_changes` on one file at a time.

### Chat mode (`allow_app_changes: false`)

Chat mode does not run intake. It runs spec when the request has attached files. Then it runs the same agentic loop in **read-only** mode.

In read-only mode, the loop refuses the write tools. The model answers with the repository scan, the documentation skills and the schema tools. It does not change files.

This refusal is not permanent. When a request must change the app, the first write tool call shows a question to the user. If the user gives permission, the session becomes a usual write session.

## Security model

The security model has three layers. Each layer covers a risk that the other layers do not cover.

**Intent gate.** This layer uses `intent_security.md` and runs in write mode only. It examines the goal text for abuse before the graph starts. It sees the _file names_ of the attachments, but not their content. The reason: a PDF of 13k tokens is expensive to examine, and it gives little signal.

**Structural containment.** This layer runs in the two modes. It is the boundary that actually stops an attack:

- In read-only mode, the loop refuses the write tools until the user gives permission.
- File access is only possible in the app repository.
- `web_fetch` can only get pages from an allowlist of Digdir hosts.
- Each change goes to a session branch. A person examines the branch before the merge.

The prompts that Langfuse serves are also in this layer. CI publishes a prompt after the prompt change merges to main. Thus, each served prompt has a reviewed commit. Refer to [Prompts and Langfuse](#prompts-and-langfuse).

**Spotlighting.** This layer runs in the two modes. It covers the content of uploaded documents, which the intent gate does not see. Users attach PDFs and images as context. This content gets to the model two times:

- as the attachment that the spec extractor reads
- as the extracted `FormSpec` in the system prompt of the loop.

The code puts the two in `<attachment_content>` and `<form_spec>` delimiters. Each delimiter has an instruction: the block is data to describe, not instructions to obey. The code escapes a closing tag in the content. Thus, a document cannot close its block too early.

`shared/utils/spotlight.py` makes the delimiters. `llm_client.py` applies them to the attachment, and `core/context.py` applies them to the form spec. This control is in the code for a reason. Langfuse serves the system prompts in all configured environments. When a managed version exists, the prompt file has no effect. Thus, a control in a prompt file only does not work. The text in the prompt file supports the control, but it does not make the control.

## Prompts and Langfuse

The files in `agents/prompts/` are a **fallback**. When Langfuse is configured, the agent serves the Langfuse version with the label `production`, not the local file. CI publishes each changed prompt file to Langfuse after the merge to main. For the publication, the drift report and the retired prompts, refer to [agents/prompts/README.md](agents/prompts/README.md).

## Project structure

```
src/AI/agents/
├── api/                  # FastAPI server
│   ├── routes/           # Endpoints: agent, websocket, token_usage, traces
│   └── main.py           # Entry point of the application
├── agents/
│   ├── graph/            # LangGraph: intake → [spec] → agentic_loop
│   │   ├── nodes/        # intake_node, spec_node, agentic_loop_node
│   │   ├── runner.py     # Builds the graph and runs the pre-graph gates
│   │   └── state.py      # AgentState
│   ├── core/             # Engine of the agentic loop (loop, tool registry, skills, tools/)
│   ├── altinn/           # Altinn domain library (app_version, datamodel, layout, resources)
│   ├── schemas/          # Plan schema for intake
│   ├── skills/           # Skills with domain knowledge, loaded when necessary
│   ├── prompts/          # Gate and pipeline prompts, and the loader. Langfuse overrides these.
│   ├── services/         # git, llm, events, preview, repo
│   └── workflows/        # Pipeline steps before the loop (intake, spec)
├── services/             # token_usage and traces, used by the api routes with the same names
├── shared/               # Configuration, models, utilities
├── benchmarks/           # Evals and the end to end benchmark (refer to benchmarks/EVALS.md)
├── scripts/              # sync_prompts and tools for test fixtures
├── infra/kustomize/      # Deployment manifests
└── tests/                # pytest suite
```
