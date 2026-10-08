# Level 2: System context

_How is the service connected with other services?_

Designer code:

- `src/Designer/backend/src/Designer/Hubs/Assistant/`
- `src/Designer/backend/src/Designer/Services/Implementation/Assistant/`
- `src/Designer/frontend/app-development/features/aiAssistant/`
- `src/Designer/frontend/libs/studio-assistant/`

The browser never calls the agents service. The Designer backend is between them. The browser talks to Designer through SignalR (`AssistantProxyHub`). Designer talks to the agents service through HTTP for commands and through one WebSocket for events. In Kubernetes, the agents service is the internal service `altinn-altinity-agents`. It listens on port 80 and sends traffic to the container on port 8071.

```mermaid
flowchart LR
  B["Browser: Designer frontend"] -->|SignalR| D["Designer backend"]
  D -->|HTTP and WebSocket| A["Agents service"]
  A -->|git clone and push| G["Gitea"]
  A -->|model calls| L["Azure AI models"]
```

_The main path. Gitea holds the app repositories. Azure OpenAI and Azure AI Foundry host the models._

```mermaid
flowchart LR
  A["Agents service"] -->|traces, prompts, scores| F["Langfuse"]
  A -->|web_fetch| W["docs.altinn.studio"]
  A -->|render check, local stack only| P["Studio app preview"]
  Q["Designer scheduler"] -->|nightly trace cleanup| A
```

_Support services. Langfuse is optional. Without it, the service records no traces and uses local prompt files._

## Connect and register a thread

Designer opens one WebSocket to the agents service for each developer. This socket stays open when the user reloads the page. Thus a run continues to send events after a page reload.

```mermaid
sequenceDiagram
  participant B as Browser
  participant D as Designer backend
  participant A as Agents service
  B->>D: Connect to AssistantProxyHub
  D->>A: Open WebSocket /ws, one for each developer
  B->>D: RegisterSession(org, app, threadId)
  D->>D: Check feature access and thread owner
  D->>A: Frame type=session with session_id and developer
  A-->>D: Frame type=session, status=registered
```

_Connection setup. The agents service sends events by developer, not by tab._

## Start a run

Designer makes a short-lived API key for each run. The key expires after 20 minutes. The agents service uses this key to clone and push through the Gitea proxy. The service has no Gitea token of its own.

Attachments go to Designer first. Designer accepts eight file types up to 20 MB each and keeps them in memory for a maximum of 30 minutes. Then it sends them as base64 in the start request.

```mermaid
sequenceDiagram
  participant B as Browser
  participant D as Designer backend
  participant A as Agents service
  participant G as Gitea proxy
  B->>D: StartWorkflow(goal, branch, allow_app_changes)
  D->>D: Make an API key that expires after 20 min
  D->>A: POST /api/agent/start with X-Api-Key and X-Developer
  A->>G: git clone with the X-Api-Key header
  A-->>D: accepted, mode is chat or workflow
  D-->>B: Response
  Note over A: The run continues as a background task
```

_The start request returns quickly. The real work happens after the response._

## Events come back

The agents service pushes events on the WebSocket. Designer sends each event to the SignalR group of the developer, so all open tabs get it. Designer also saves the final answer in its own database. This step makes sure that the answer is not lost when no tab is open.

```mermaid
sequenceDiagram
  participant A as Agents service
  participant D as Designer backend
  participant DB as Designer database
  participant B as Browser tabs
  A-->>D: status and assistant_message_chunk frames
  D-->>B: ReceiveAgentMessage to the developer group
  A-->>D: assistant_message
  D->>DB: Save the message in the chat thread
  D-->>B: assistant_message with persistedMessageId
  A-->>D: done
  B->>D: Reset the repo and check out the session branch
```

_Event flow from the agents service to the user._

## Permission prompt and cancel

In chat mode, the first write tool call stops the loop and sends a `permission_request` event. The loop waits for the answer for a maximum of 300 seconds. No answer counts as "no". A cancel request sets a flag. The loop reads the flag at the start of each turn.

```mermaid
sequenceDiagram
  participant B as Browser
  participant D as Designer backend
  participant A as Agents service
  A-->>B: permission_request with request_id, through Designer
  B->>D: RespondToPermission(sessionId, requestId, granted)
  D->>A: POST /api/agent/permission/ID
  A-->>B: permission_request with resolved=true
  B->>D: CancelWorkflow(sessionId)
  D->>A: POST /api/agent/cancel/ID
  A-->>B: error event with status=cancelled
```

_Two user actions during a run. The agents service checks that the caller owns the session._

## Deploy

A merge to main that changes `src/AI/assistant` goes to staging and production. The workflow `deploy-studio-ai-agents.yaml` builds the image, publishes the manifests as an OCI artifact and tags the artifact for each environment. Flux then does the rollout.

The pod gets five secrets from Key Vault: the Azure key and four Langfuse values. The model names are not in the manifest, so they come from the defaults in code.

```mermaid
flowchart LR
  M["Merge to main"] --> A["GitHub Actions: image and OCI artifact"]
  A --> F["Flux: staging, prod"]
  F --> P["Agents pod"]
  K["Key Vault, through External Secrets"] --> P
```

_The deploy path. A change to the code goes to production in a few minutes._

## The benchmark workbench

The benchmark runner is a local command line tool. It does not run in production. Most evals call the models directly with the production prompts, without the agents service. Only the end to end eval starts real runs on a local agents service, through the same `/api/agent/start` route that Designer uses.

```mermaid
flowchart LR
  R["Benchmark runner, local"] -->|datasets, experiments, scores| F["Langfuse"]
  R -->|fast evals: direct model calls| M["Azure AI models"]
  R -->|end to end: start and poll runs| A["Agents service"]
  R -->|clone the session branch| G["Gitea"]
```

_What the runner connects to. Langfuse holds the dataset items and the results of each run._

An end to end item makes two traces in Langfuse. The runner trace has the scores. The agent trace has the model calls. The runner sends an `experiment` object in the start request, and the agent puts it on its trace. This connects the two traces.

```mermaid
sequenceDiagram
  participant R as Runner
  participant F as Langfuse
  participant A as Agents service
  participant G as Gitea
  R->>F: run_experiment, get the dataset items
  loop each item, one at a time
    R->>A: POST /api/agent/start with experiment context
    R->>A: GET /api/agent/status until the run ends
    R->>G: Clone branch assistant_xxxxxxxx
    R->>R: Score the app against the rubric
    R->>F: Item scores on the task trace
  end
```

_One end to end eval. The items run one at a time, because each run pushes to the same test repository._

GitHub Actions does not run the benchmark. The workflow `assistant-evals.yaml` only checks if a pull request makes the current baseline invalid. Scores change between runs, and a run costs money and needs secrets. For these reasons, the bench is a local command.

```mermaid
flowchart LR
  P["Pull request in src/AI/assistant"] --> J["Impact job"]
  J --> B["BASELINE.json"]
  J --> D["Digests of actor prompt and tools"]
  J --> V{"Baseline still valid?"}
```

_The CI gate. It fails when a change moves what the bench measures and the pull request has no new `BASELINE.json`._
