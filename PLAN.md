# Refactor build and deploy

In src/Designer we build and deploy apps using Azure DevOps.

Workflow
- User trigger builds which writes to a database and queues job on to Azure DevOps classic pipeline (not in this repo)
- ADO build job builds docker container and pushes to ACR
- Pipeline calls back to Designer API to notify of completion
- User trigger deploy which writes to a database and queues job on to Azure Devops deploy-app.yaml (on main branch by default)
- ADO deploy job does multiple things: get Application Insights key, APIM subscription key, packages OCI artifacts, pushes to ACR
- Quartz.NET Polling job in Designer polls the ADO run until complete, calls runtime gateway for reconciliation etc
- Flux in runtime AKS clusters through apps-syncroot pulls OCI artifacts and ensures they are deployed

There are multiple problems

- Azure DevOps gives us limitations in terms of parallelism (we dont own the infra)
- We've had incidents with deploy pipelines where suddenly downloads of Azure CLI (which we use to provision Azure API Management subscription keys, see deploy-app.yaml) takes almost an hour to complete, it is seemingly downloading from github and some networking crawls to a halt. This is critical, because it means service owners cant publish hotfixes
- CICD solutions like this is inherently inefficient because the underlying infra is throwaway, leading each run having to download a bunch of tooling to be able to run
- YAML is a bitch to maintain
- There is 1 global pipeline across environments
- Deployment pipeline has too many responsibilities (one can argue it is partially building since it is packaging things such as MaskinportenClient, helm values  etc... It checks out a commit)
- Many failure modes. This code is very naive the possible state space is huge


## Goals

In the short term, we need to make build and deployment more reliable. Right now APIM subscription key can suddenly take 60 minutes because the deploy pipeline task tries to download Azure CLI through Github.
It is unclear how we can solve this in the short term, we rely on Service Connection/Principal through Azure and we dont have the secret for it, but maybe platform team can support us on this.
Long term:

- Workflow-engine like architecture based on PostgreSQL
  - Click build = saves to DB, rest is async
  - Click deploy = saves to DB, rest is async
  - The engine drives the builds and deploys forward and keeps track of status in DB
  - SignalR still for status updates
- Build and deployment workflows run on Studio AKS cluster
  - Dedicated nodepool running container images with preinstalled tooling:
    - docker
    - flux
    - ...
  - Workflows should not rely on token/cookie/session from logged in user
  - Security model: only trusted code runs (our code), so privileged containers is fine
  - Local development must not require Kubernetes/kind
    - same engine/state model, but local executor backend
- Existing API/UI behavior must remain compatible
  - Existing endpoints and UI flows continue to work as today
  - Re-architecture is internal: execution model + status propagation

## Workflow engine design (recommended)

Design goal:
- Decouple user request from infra side effects, and move more responsibility to build stage.

Core model:
- Reuse existing Designer schema/tables as workflow persistence:
  - `designer.releases`
  - `designer.deployments`
  - `designer.builds`
  - `designer.deploy_events`
- API call only validates + persists command + returns accepted.
- Engine executes steps asynchronously and owns workflow state updates in DB.
- Workers execute side effects and report outcomes back to the engine.
- SignalR continues to publish state changes to UI.
- Engine implementation in Designer:
  - Quartz-based dispatcher loop (`WorkflowDispatchJob`) runs every 5 seconds
  - claims pending work in batches (start with 20-50) with row locking (`FOR UPDATE SKIP LOCKED`)
    - likely via raw SQL in EF Core/Npgsql, not standard LINQ
  - cluster-safe scheduling (Quartz persistent store + clustering) and no concurrent duplicate dispatch

Schema reuse constraints:
- Do not introduce a parallel workflow persistence model as default.
- Keep existing status/event contracts used by current API/UI:
  - `BuildStatus` / `BuildResult` on existing `BuildEntity`
  - existing deploy event stream (`DeployEventType`) for deployment timeline/state
- Keep existing repository wiring (`ReleaseRepository`, `DeploymentRepository`, `DeployEventRepository`) as integration surface, then evolve internals behind it.
- Single-writer rule for status persistence:
  - only Designer API/engine path writes `releases/deployments/builds/deploy_events`
  - workers do not write workflow status tables directly

Recommended workflow states:
- `pending` -> `running` -> `succeeded | failed`
- No automatic retry for failed build/deploy.
- Re-run is explicit and creates a new workflow instance.

Workflow state mapping to existing schema:
- `pending`
  - `builds.status = NotStarted`
  - `builds.result = None`
  - `releases.buildstatus/buildresult` mirrors the same values
  - no final deploy event exists yet
- `running`
  - `builds.status = InProgress`
  - `builds.result = None`
  - `releases.buildstatus/buildresult` mirrors the same values
  - `PipelineScheduled` is written when execution is actually handed off, not on command acceptance
- `succeeded`
  - `builds.status = Completed`
  - `builds.result = Succeeded`
  - `releases.buildstatus/buildresult` mirrors the same values
  - deployments append final domain event (`InstallSucceeded`, `UpgradeSucceeded`, `UninstallSucceeded`)
- `failed`
  - `builds.status = Completed`
  - `builds.result = Failed | Canceled | PartiallySucceeded`
  - `releases.buildstatus/buildresult` mirrors the same values
  - deployments append final domain event (`InstallFailed`, `UpgradeFailed`, `UninstallFailed`)
- `builds` is the execution truth
- `releases.buildstatus/buildresult` remains a compatibility mirror for now
- invalid combinations:
  - `Completed + None`
  - `NotStarted + Succeeded/Failed/Canceled/PartiallySucceeded`

Recommended build workflow:
- Validate input (org/app/ref/env constraints).
- Resolve immutable input (commit/tag + config snapshot).
- Build + package all deployable artifacts.
- Publish artifacts + metadata manifest (digest/version/refs).
- Mark build completed in DB.

Example behind the scenes (build):
- User calls create release/build endpoint.
- Designer validates request and persists initial state in existing tables (`releases` + `builds`).
- Dispatcher picks pending build every ~5s, claims it, and schedules execution asynchronously.
- Worker executes build/package/publish and reports outcome to engine.
- Engine updates `builds.status/result` and related `releases` record.
- SignalR + existing query endpoints expose updated status exactly as today.

Recommended deploy workflow:
- Validate permissions + target environment.
- Resolve previously produced build manifest (required input).
- Apply environment-specific configuration only.
- Trigger GitOps sync/reconcile.
- Observe completion and store final result in DB.

Example behind the scenes (deploy):
- User calls deployment endpoint.
- Designer validates permissions/input and persists deployment row (`deployments`) with linked `builds` state.
- Dispatcher picks pending deploy every ~5s, claims it, and schedules execution asynchronously.
- Worker performs environment apply/reconcile actions and reports progress/outcome to engine.
- Engine updates `builds.status/result` and appends `deploy_events` (`PipelineScheduled`, success/failure, etc.).
- Existing deployments API + SignalR continue to drive the same UI timeline/state behavior.

Why this split:
- Build does heavy/slow/variable work once.
- Deploy should mostly apply already-built artifacts, reducing time and failure surface.

### Responsibility split

- Designer API:
  - Command ingestion, authz, validation, status queries, SignalR notifications.
  - Must not perform long-running infra mutations in request thread.
- Workflow engine (recommended inside Designer first, not separate service):
  - State machine transitions, scheduling, concurrency control, recovery of stuck workflows.
- Workers:
  - Execute side effects (build/package/publish/deploy/reconcile).
  - Use system credentials, never user cookie/session/token.
  - Can share DB and/or call Designer API for execution concerns, but status persistence goes through engine.
  - Production executor schedules one K8s Job per claimed run.
  - Scale with dispatcher caps first, autoscaling second:
    - per app+env deploy concurrency = 1
    - initial global caps: deploy = 10, build = 4
    - reserve capacity so builds cannot starve deploys
  - Separate build/deploy worker classes and resource profiles.
  - Local executor backend (no Kubernetes) runs same steps in-process or local process for dev.

Compatibility guardrail:
- Preserve current external contract:
  - same API routes and response shapes
  - same SignalR update behavior
  - same visible status semantics in UI
- Change only internal execution mechanism and how status gets produced/propagated.

### Migration/cutover assumption

- Planned downtime is acceptable.
- During downtime, disable new build/deploy requests, cut over to new engine, then reopen.
- No handling of in-flight old workflows is required.

### Instrumentation assumption

- Keep instrumentation similar to current solution:
  - workflow/step status events
  - correlated logs/traces
  - SignalR updates on important transitions

### Dependency assumption

- Assume platform team support is available where needed.


## Files

- src/Designer/backend/src/Designer/Controllers/DeploymentsController.cs
- src/Designer/backend/src/Designer/Controllers/PipelinesController.cs
- src/Designer/backend/src/Designer/Services/Implementation/DeploymentService.cs
- src/Designer/backend/src/Designer/TypedHttpClients/AzureDevOps/AzureDevOpsBuildClient.cs
- src/Designer/backend/src/Designer/Scheduling/DeploymentPipelinePollingJob.cs
- src/App/azure-pipelines/deploy-app.yaml
- infra/runtime/syncroot/base/apps-syncroot.yaml
