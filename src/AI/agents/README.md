# Studio Assistant: AI agent for Altinn Studio

Studio Assistant is an AI agent. It changes Altinn Studio apps from instructions in natural language.

## What Studio Assistant does

Studio Assistant knows the patterns of Altinn Studio development. LangGraph controls the steps of the agent. The agent can make, validate and apply code changes to your app. It can also answer questions about Altinn and not change the app.

## Prerequisites

- Access to Azure AI models: Azure OpenAI, and Claude through Azure AI Foundry (`AZURE_ANTHROPIC_ENDPOINT`). If Azure is not available, the agent can use an OpenAI key.
- A Langfuse project. The agent sends traces to Langfuse and gets prompts from Langfuse.
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

### Lint, format and test

```bash
pip install -r requirements.txt -r requirements-dev.txt

ruff check .          # lint (add --fix to correct the problems)
ruff format .         # format
python -m pytest      # unit tests
```

CI runs `.github/workflows/altinity-build-test.yaml` on each pull request. This workflow runs `ruff check`, `ruff format --check` and `pytest`. Then it starts the server and examines `/health`.

## Features

- 🤖 **Code generation**: The agent makes Altinn code with Altinn tools that run in the same process.
- 💬 **Chat mode**: You can ask questions. The agent does not change the app.
- ✅ **Validation**: The agent validates the schema and the business rules.
- 🔄 **Undo one file**: `discard_file_changes` removes the changes in one file.
- 🌲 **Git integration**: Each session has its own branch. You can see all changes on this branch.
- 📊 **Observability**: Langfuse records traces and costs.

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

### Chat mode (questions and answers)

```json
{
  "session_id": "unique-session-id",
  "repo_url": "http://gitea:3000/org/app.git",
  "org": "org",
  "goal": "How do I use dynamic expressions to hide fields?",
  "allow_app_changes": false
}
```

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

Connect to the WebSocket to get the workflow events in real time:

```javascript
const ws = new WebSocket('ws://localhost:8071/ws');

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: 'session',
      session_id: 'your-session-id',
      developer: 'your-username', // Necessary. Without it, the server closes the socket.
    }),
  );
};

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);

  switch (type) {
    case 'status':
      // The workflow progress changed
      break;
    case 'assistant_message_chunk':
      // One part of the streamed response
      break;
    case 'assistant_message':
      // The final response from the agent
      break;
    case 'permission_request':
      // A read-only session asks for write access. Answer with /api/agent/permission.
      break;
    case 'plan_proposed':
      // Intake made a change plan
      break;
    case 'done':
      // The workflow is complete
      break;
    case 'error':
      // An error occurred
      break;
  }
};
```

## Configuration

`.env.example` shows all variables and their defaults. You must set these:

```env
# Necessary: the Azure key. Azure OpenAI and Claude on Azure AI Foundry use it.
AZURE_API_KEY=your-key
# Optional: the endpoints have defaults in shared/config/base_config.py
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_ANTHROPIC_ENDPOINT=https://<resource>.services.ai.azure.com/anthropic/

# Necessary: the Gitea proxy for clone and push. Git uses the X-Api-Key
# header of each request, so you do not set a Gitea token here.
GITEA_BASE_URL=http://host.docker.internal/repos

# Necessary: Langfuse for observability and prompt management
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

Then a small LangGraph runs: **intake → [spec] → agentic loop**.

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

The files in `agents/prompts/` are a **fallback**. They are not the source of truth. When Langfuse is configured, `get_prompt_with_langfuse` serves the version with the label `production`. The agent does not read the local file.

The two copies can become different, and nobody sees it:

- A code review does not show a prompt change in the Langfuse UI.
- A prompt change in the repository has no effect until somebody publishes it.

`scripts/sync_prompts.py` shows these differences and can correct them.

```bash
python -m scripts.sync_prompts --diff                    # all prompts, repository and Langfuse
python -m scripts.sync_prompts --diff spec_extraction    # one prompt
python -m scripts.sync_prompts --promote spec_extraction --version 1   # go back to an earlier version
```

CI publishes the prompts. Do not publish them from a laptop. `.github/workflows/assistant-prompts.yaml` does these steps:

- On each pull request that changes `agents/prompts/`, it runs `--diff`. Thus, you see the differences before the merge.
- On each merge to main, it runs `--push`. This publishes each changed prompt as a new version with the label `production`. The commit message of the version is the URL of the merge commit.

`--push` does not run unless `ALLOW_PROMPT_PUSH=1` is set. CI sets it. Do not set it on a laptop. To go back to an earlier version, promote that version.

A full `--diff` also shows the Langfuse prompts that have no file in the repository. Be careful with these names. If you add a file with one of these names, the agent serves the old Langfuse version until CI publishes the new one. Also, the Langfuse list shows an old prompt with the label `production`.

Retire these prompts with `python -m scripts.sync_prompts --retire`. This command saves all versions to `agents/prompts/retired.json`. Then it deletes the prompt in Langfuse. Set `ALLOW_PROMPT_DELETE=1` before you use it.

When `--diff` shows a difference, read it before you do an action. The local file can be older than the Langfuse version.

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

## Dependencies

- FastAPI
- LangGraph
- LangChain (`langchain-core`, `langchain-openai`)
- OpenAI and Anthropic SDKs
- Langfuse
