# Agent platform

As an alternative to buying someone else's cloud agents, we should try to build our own.
Important considerations:

- Open source and open standards, according to architecture principles
- Minimal coupling to external infrastructure and dependencies
- Minimal coupling to specific harnesses and models
- Flexibility in deployment (run locally and in the cloud, e.g. Kubernetes)
- Support for multiple different virtualization/containerization mechanisms
- Support for major operating systems: Windows, macOS and Linux
- Agents should not have access to secrets
- Ability to enforce
  - network access across Ethernet, TCP, UDP, HTTP/WS and HTTPS/WSS
  - context-aware authorization of operations originating inside Agents and Sandboxes, including network and
    credential use
- Ability to automate roles and workflows (virtual employees)
- Extensibility and reusability across teams, contexts, harnesses, workflows, tools and integrations
- Agents can be long-running
- Agents can be prompted from a variety of external sources, such as GitHub and Slack
- Each sandbox should be able to host multiple agent sessions
- We should be able to put smart delegation/coordination/automation on the control-plane level
- Clients for desktop and web should be able to list online sandboxes, create sessions and ask control planes to
  create new sandboxes
- Agents should be able to use standard development tools, including Docker or Podman, `strace` and `perf` inside a
  Linux Sandbox

## Development

See the [`Makefile`](Makefile) for available development commands.

To build the current source as version `v0.0.0`, package it exactly like a release and install `agentctl` and
`agentd` for the current user:

```sh
make user-install
```

Run this from `src/experimental`. Binaries are installed to `~/.local/bin` on Linux and macOS, or
`%LOCALAPPDATA%\Agent\bin` on Windows. Agent control-plane state defaults to `~/.agent` on Linux and macOS, or
`%LOCALAPPDATA%\Agent` on Windows. `AGENT_INSTALL_DIR` overrides the binary destination and `AGENT_HOME`
overrides the control-plane home.

## High-level Architecture

- Client-server-operator model
  - Servers as local control planes
  - Operator as global/cloud orchestrator and scheduler
  - Clients that can connect and support good DX remotely and locally
- Backend-neutral Sandbox abstraction with capability discovery
  - Support different isolation mechanisms, each with its own benefits and drawbacks
  - Allow higher layers to discover supported Sandbox Features and Network Endpoints
- Custom network and MITM stack for authorization enforcement and credential mediation
- Correctly layered and decoupled
  - Sandboxes are useful independently from AI, including for Gitea and GitHub CI runners
  - The custom network does not depend on virtualization backends or kernel API details

### Concepts

The current implementation keeps all management host-side. `agentctl` starts the adjacent `agentd` binary on demand;
`agentd` owns the Agent, Session, credential, policy and secret state in one private SQLite database. The Sandbox
contains only tmux, Claude Code and development tools:

```text
Host
├── agentctl     Agent Control Plane CLI and direct terminal attachment
└── agentd       Agent Control Plane, SQLite owner, credential manager and policy engine
    └── Agent
        └── Microsandbox VM
            ├── tmux Session → Claude Code
            └── tmux Session → Claude Code
```

There is deliberately no generic sandbox-resident Agent Runtime. `agentd` persists each Session's UUID,
user-facing name, lifecycle state and harness-native conversation ID; tmux identity is not persisted, and the tmux
session name is derived from the Session UUID. Reconciliation idempotently creates or finds the tmux session on
every delivery, so a missing process is recreated after `agentd` restarts while terminal detach leaves it running
until the idle threshold. Tmux is the single Session
runtime behind one module boundary; a second runtime (Herdr, Agent Host Protocol) must establish the required
interface before any generic driver hierarchy is added. Rich terminal, chat and
event capabilities are separate from lifecycle convergence rather than forced into one generic Session protocol.
The control-plane home is overridden by `AGENT_HOME` or `--home`.

The current database schema is intentionally clean-slate while the Agent layer is experimental. This build does
not migrate earlier Agent databases or adopt Sandboxes created by an earlier schema. Stop `agentd` and purge the
configured Agent home (including its `microsandbox/` directory) before installing when the schema changes.

The Sandbox layer is independent of Agent automation. A Node is a host machine or VM, a Sandbox is an isolated
execution environment on that Node, and an Execution is a running command inside the Sandbox.

```text
Node
└── Sandbox
    └── Executions
```

The Agent layer builds on the Sandbox layer. The Agent Control Plane manages Agents, each Agent owns one Sandbox,
and the host-side Session controller owns durable Sessions whose harness processes run inside that Sandbox.
Each Agent incarnation has an immutable `AgentId`; names may be reused only after the prior incarnation has reached
its persistent deletion tombstone. Sessions, host secrets and the internal Sandbox name are scoped by `AgentId`, so
a replacement Agent cannot inherit retained resources from an older incarnation with the same name.
`AgentId` belongs to the stored control-plane record and does not appear in the input manifest.

Desired state in SQLite is the durable reconciliation queue. `apply` and `delete` send bounded low-latency wakeups,
while startup and periodic full scans guarantee at-least-once observation after dropped wakeups or daemon restarts.
One generic keyed controller schedules both resource kinds. Different Agent IDs and Session IDs reconcile
concurrently up to fixed bounds; each individual ID is serialized, and a wakeup received during a pass schedules a
subsequent pass. Provider selection is persisted as the Agent's sticky Sandbox assignment before effects begin.
The Agent controller is the sole owner of mediation replacement, Sandbox ensure, platform setup and release. A
Session pass requires persisted Ready + Materialized Agent status, opens that exact Sandbox without lifecycle
effects, and owns only its derived tmux session. Session ensure persists the Session intent and activation revision,
then wakes and waits for Agent convergence, so Session work cannot race Sandbox creation or resurrect a deleting
Agent. Provisioning failure or client disconnection still leaves durable work for the controllers to repair.

Sessions persist an explicit `Starting`, `Running`, `Idle` or `Failed` lifecycle state. An unattached Session with
no tmux terminal activity for five minutes is stopped and recorded `Idle`; idle age is calculated inside the
Sandbox to avoid host/microVM clock skew. A later ensure increments a durable activation revision and relaunches
with the harness-native ID when its harness-owned transcript exists. A startup-only ID without a transcript falls
back to a fresh launch. Deliberate idle stops do not contribute to crash backoff. Initial Agent
provisioning can take minutes, so `agentctl` reports that it is waiting while the control request blocks on Agent
and Session convergence.

Linux Agent setup distrusts the guest filesystem as a source of completion state. It verifies the declared harness
version and rewrites Agent-owned derived configuration on every pass. Home content is transferred as one archive.
Workspace initialization is owned by the image or its idempotent init/entrypoint scripts, not the Agent manifest. The
image builder decides which repositories are cloned at boot; Sessions may clone other accessible repositories on
demand. Linux Sessions always launch in `/home/agent/code`; repository checkouts are children of that stable workspace
root rather than Session placement targets. Checkouts are persistent runtime data and are never reconciled or deleted
by the Agent controller. An Agent image selected with `initSystem: image` exposes
`/usr/local/libexec/agent-image-ready`; Linux setup runs that image-owned readiness check before declaring the Agent
ready. The self-development image uses it to wait for its single boot-time clone attempt, while allowing readiness
after a failed attempt so the attached Agent can create a missing checkout from builder-supplied `AGENTS.md` guidance.

SQLite state is split into columns by write owner (desired state, lifecycle, native harness identity and launch
bookkeeping), and the clean-slate database and local control protocol are both version 1.

Harness configuration has explicit ownership and lifetime. Example images may seed harness-owned mutable state such as
Claude's `.claude.json` once at image build time, after which the harness and user own it. Agent setup continuously
reconciles only its own hook, settings, placeholder credentials and `spec.home` overlay; Microsandbox's trusted guest
bootstrap installs its mediation CA at Sandbox boot. Agent setup does not rewrite the Claude state file. A builder may
legitimately include Claude state or a Codex `config.toml` in `spec.home` when continuous desired-state ownership is
intended, with the consequence that the supplied file is reapplied every pass.

The Agent controller reconciles every durable Agent on daemon startup and every 30 seconds, with immediate passes
after apply/delete requests. Every pass reloads manifest secrets, replaces network secret bindings and policy,
ensures the Sandbox, then reapplies the `spec.home` archive and Agent-owned harness configuration. Home application is
an overlay: new and changed host files converge, but removing a host file does not delete the guest copy. Secret
material is resolved from the host store on every authorized use, so a rotated value behind an existing binding
becomes active after the next pass without restarting the Sandbox. Removed manifest bindings are also deleted from
the Agent-scoped host secret namespace, and finalization deletes the namespace without affecting shared harness
credentials. Adding or removing a binding reconnects that Sandbox's Network so the runtime gets the new handshake
configuration. Reconciliation propagates rotation; it does not mint or refresh an expired third-party credential—the
host credential manager or user must first replace that value.

The SQLite owner enables `secure_delete`, so SQLite overwrites deleted content in database pages it manages. This is
best-effort local hygiene rather than a cryptographic erasure guarantee across WAL history, filesystem snapshots or
backups; owner-only control-plane directory and database permissions remain the confidentiality boundary.

```text
Agent manifest requirements
        ↓
configured Provider capability resolution
        ↓ persist Selected { provider }
Provider ensure → resolved Sandbox platform → matching platform adapter
        ↓
persist Materialized { provider, sandbox ID }
```

```text
Agent Control Plane (on the host)
└── Agent
    ├── Session Controller (on the host)
    └── Sandbox
        └── tmux Sessions
```

CI uses the Sandbox layer directly and does not depend on Agent concepts. A future Runner Coordinator creates an
ephemeral Sandbox and starts the runner as an Execution.

```text
Runner Coordinator
└── Sandbox
    └── Runner Execution
```

A future Operator schedules Sandboxes across Nodes. It sits above the generic Sandbox layer and does not change the
ownership model inside a Sandbox.

**Scenarios**:

Github trigger:
- Altinn Studio dev, e.g. @martinothamar:
  1. > @altinn-studio-agent get an agent to work on this issue, the session should use Fable 5 with high reasoning
    - Control plane detects which user is prompting
    - @martinothamar is registered in the global control plane, and has logged in with Claude session (OAuth flow in the platform)
    - Control plane spins up a special orchestrator agent in a sandbox (using @martinothamar access/membership), which is tasked to consutrct
      - `spawn.agent` call
      - `spawn.session` call (specs from prompt, Fable 5 with High)
      - prompt for the agent based on input
    - Control plane provisions agent according to requests, including session and `initialPrompt`
    - Agent subsequently calls back to the issue (according to instructions?)


### Tech stack and features

- Languages:
  - Rust for the local control plane, CLI, sandbox SDK, sandbox integrations and the host-side Agent automation layer
  - Go for later operator/Kubernetes scheduling and orchestration
  - JavaScript plugin support may be added later through isolated subprocesses; it is not part of the
    first iteration
- Sandbox backends: Microsandbox, QEMU, more later
- Network: independently composable Network Backends connected through negotiated packet, intercepted-flow or
  versioned control-protocol endpoints
- SDKs to manage sandboxes and agents
- OCI images built from user-supplied Dockerfiles or resolved from registry references
- Provider-neutral prepared-image operations for transporting pristine, pre-materialized derivatives of OCI
  images; formats remain opaque, Provider-owned and usable only with compatible Sandbox Providers

#### Initial deliverable

- A reusable, backend-neutral Sandbox SDK for agent automation, CI runners and other isolated workloads
- A Linux Microsandbox implementation with Dockerfile and OCI image sources
- Long-lived Sandboxes with execution, file transfer, storage, mutable resources and interactive terminals
- An independently composable Network Backend with live authorization and credential mediation
- Strict separation between generic Sandbox infrastructure and Agent automation
- A local Agent Control Plane with declarative Agents and imperative Sessions
- Multiple Codex or Claude Code Sessions per Agent through a harness-neutral Session API
- Host-managed subscription and GitHub authentication without placing credentials in Sandboxes
- Portable APIs for Linux, macOS and Windows hosts, initially materializing Linux Sandboxes
- Familiar Kubernetes-style resource quantities, manifests and CLI semantics where applicable
- An Agent able to modify and test this platform from an isolated workspace initialized by its image
- Production-quality API foundations verified through automated tests and a manual native-platform test matrix

##### Agent layer implementation plan

The current implementation uses host-managed named tmux sessions and Claude Code only. The first bullet
describes that delivery; every bullet after it is ordered planned work that lands incrementally after the
workshop milestone, not a description of the current implementation.

- The initial delivery includes a persistent real-Microsandbox Agent lifecycle, declarative manifests, host-mediated credentials,
  manifest-derived egress policy, image-owned workspace initialization, and imperative named tmux sessions. Harness-specific
  credential formats, authentication maintenance, mediated secrets, bootstrap and launch behavior stay under
  `agent/src/harness/claude_code/`; generic orchestration dispatches through the closed harness enum. The Agent-side
  adapter for the concrete Microsandbox Provider and Network Backend stays under
  `agent/src/sandbox/microsandbox/`; Linux Sandbox layout and commands stay under
  `agent/src/sandbox/platform/linux.rs`. The reconciler depends only on the Agent Sandbox service. That service
  resolves configured Providers from manifest requirements, persists the selected Provider before starting effects,
  and dispatches setup from the platform reported by the materialized Sandbox. The current composition registers Microsandbox and Linux,
  while the same runtime boundaries allow additional Providers and Sandbox operating systems. Runtime bundle downloads
  are admitted only for host tuples with a release-pinned SHA-256 digest.
- Evolve the persistent, harness-neutral Session resource into the full driving and content model
  - Use this public data model; the control plane assigns the UUID, and `CreateSession.workingDirectory` defaults to
    `$HOME/code` while the resulting `Session.workingDirectory` is always the resolved absolute Sandbox path:

    ```text
    HarnessInstallationId {
      Claude,
      Codex
    }

    CreateSession {
      agentId: AgentId
      initialPrompt: String
      modelId: String
      reasoningEffort: String
      accessMode: String
      harnessInstallation: HarnessInstallationId
      workingDirectory?: SandboxPath,
      plugins: SessionPlugin[]
    }

    Session {
      id: SessionId (UUID)
      agentId: AgentId
      initialPrompt: String
      modelId: String
      reasoningEffort: String
      accessMode: String
      harnessInstallation: HarnessInstallationId
      workingDirectory: SandboxPath
      state: Starting | Running { activity: SessionActivity } | Stopped | Failed
      createdAt: Timestamp
      updatedAt: Timestamp
      archivedAt?: Timestamp
      deletedAt?: Timestamp
    }

    SessionPlugin [
      sessionId: SessionId
      pluginId: String
      state: JSONB
    ]

    SessionActivity = Unknown | Idle | Working | WaitingForInput (associated data?) | WaitingForApproval

    SessionContent {
      rootThreadId: ThreadId
      threads: Thread[]
    }

    Thread {
      id: ThreadId
      parentThreadId?: ThreadId
      kind: Primary | Subagent
      turns: Turn[]
    }

    Turn {
      id: TurnId
      state: InProgress | Completed | Interrupted | Failed | Unknown
      items: ThreadItem[]
      startedAt?: Timestamp
      completedAt?: Timestamp
    }
    ```

  - Keep harness-native conversation identifiers opaque to the platform and separate from the stable
    Session ID
  - Store Session metadata in SQLite through `rusqlite`, using a dedicated database thread so synchronous database
    work does not block the Tokio local runtime
  - Treat `initialPrompt` as display metadata only; read messages, responses, tool calls and other Session contents
    directly from harness-native JSONL, SQLite or equivalent storage through the selected Harness Adapter
  - Hydrate `SessionContent` on demand instead of persisting it; derive stable, Session-scoped Thread and Turn IDs from
    harness-native identifiers or deterministic storage locations
  - Represent harness-native subagents as child Threads in `SessionContent`; they remain within their owning
    Session's harness and lifecycle and are not independently managed platform Sessions
  - Submit prompts to the Session runtime without durable delivery or automatic retry; expose successfully written
    prompts as in-memory pending submissions until the Harness Adapter observes them or they expire after ten seconds
  - Replace the persisted Run API with `getSessionContent`, `submitPrompt`, `steerSession` and `interruptSession`;
    Turns are read-only harness-derived content rather than platform-managed resources
  - Allow archive, unarchive and soft delete only while a Session is `Stopped`; represent them with `archivedAt` and
    `deletedAt`, hide them from normal listings, and garbage-collect deleted Session metadata after 30 days
- Generalize harness configuration to declared installations
  - Evolve `spec.harness` into a declared list of harness installations (`kind`, `version`, `authMode`).
    A Session's `harnessInstallation` must reference one of its Agent's declared installations and is
    rejected at the API otherwise.
  - Configuration is declare → verify → inject. Setup iterates the declared installations and dispatches
    through the closed harness enum; each adapter owns its full configuration surface (credential
    placeholder format, settings, hooks, MCP registration). Execution inside the Sandbox is verification
    only (`<harness> --version` per declared installation): a declared-but-missing installation fails
    reconciliation with a condition, and an installed-but-undeclared harness is never configured,
    authenticated or mediated.
  - Inject configuration at three lifetimes: static tooling and optional instance-agnostic seeds for
    harness-owned mutable state in the image; per-Agent files written idempotently during setup into
    agent-owned paths, selected via flags and environment rather than merged into repository or
    harness-default settings; and per-Session dynamic values (session ID, report directory, per-Session
    platform token) as environment at Session launch. Builders may instead place a harness file in
    `spec.home` when they explicitly want continuous desired-state ownership. Per-Session values reach
    the static per-Agent files through environment expansion (for example `${AGENT_SESSION_TOKEN}` in
    MCP configuration; verify expansion support per harness).
  - Credential mediation and `authMode` are per installation: an Agent that declares only Codex gets no
    Anthropic token binding.
- Extend the Sandbox-facing platform endpoint with delegation and host plugins
  - Serve a platform MCP server from `agentd` on a virtual host (for example `https://agent.internal`),
    reachable from inside the Sandbox only through the mediated Network Backend. This adds no
    backend-specific control channel: it is an application protocol on the network data plane every
    Sandbox Backend already supports, the MITM CA required for credential mediation already covers it,
    and the harness adapter registers the endpoint through each harness's native MCP configuration at
    bootstrap.
  - Authorize every call as an operation originating inside a Sandbox through `sandbox-authorization`,
    failing closed. The Network Backend attachment identifies the calling Agent. Narrowing identity to
    a Session additionally requires an isolated credential-delivery and execution boundary; the current
    same-UID tmux Sessions cannot authenticate against each other.
  - Expose `agent.spawn` and `session.spawn` as built-in platform tools on that server. They call the
    Agent Control API and record the calling Session as creation provenance, keeping platform delegation
    separate from harness-native subagents — child Threads never gain independent platform lifecycle.
  - Run plugins as isolated host-side subprocesses with two faces: they may register tools on the
    agent-facing MCP server, and they may subscribe to external events (for example pull-request events)
    and act through the Agent Control API. An automation is an event-triggered plugin action; end-to-end
    automations also need the Session driving above. Plugins are trusted host code with control-plane
    access — agent-suggested code must never execute inside a plugin.
  - Treat code mode as a consumption style, not a second transport: the image may later ship a small CLI
    or generated typed client against the same MCP endpoint so a harness can script many platform calls
    in one execution. Same pipe, same authorization.
- Complete the host-side Agent API and CLI
  - Expose Agent lifecycle, Session and event operations through the versioned Agent Control API
  - Add concise Kubernetes-style `agentctl` commands and status/progress output for those operations
  - Preserve a single per-user `agentd` and host control-plane home on Linux, macOS and Windows
- Add mediated authentication and egress
  - Store provider accounts and credentials only in the host control-plane home
  - Mint each harness its **own** long-lived host token through an interactive login (`agentctl claude
    login`, later `agentctl codex login`), separate from the user's own harness login so neither
    invalidates the other. A future `agentctl`-driven PKCE grant is an additive credential kind
  - Mediate GitHub authentication and authorized network requests through the Network Backend and
    `sandbox-authorization`, without copying credentials into the Sandbox
  - Fail closed when authorization, secret resolution or the trusted network path is unavailable
- Prove the deliverable with a self-development Agent
  - Build an Agent image containing the required harnesses and development tools, with idempotent workspace initialization
  - Demonstrate concurrent Codex and Claude Code Sessions through the common Session API
  - Demonstrate that the Agent can modify and test this workspace, survive restarts and retain its Sessions
  - Automate backend-neutral and Linux/Microsandbox coverage, then complete the documented native-host manual matrix

## References

- agentdp, nvt-agent: prototypes of agent platforms
- Microsandbox, smolvm: implementations of microVMs and sandboxes, including networking
- herdr: agent multiplexing and parsing of harness state, such as running Claude Code or Codex CLI sessions
