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

The host and Sandbox each have a separate service and CLI pair:

```text
Host
├── agentd       Agent Control Plane and API server
└── agentctl     Agent Control Plane CLI

Sandbox
└── Agent Runtime
    ├── sessiond       Session, harness and plugin runtime
    └── sessionctl     Local Agent Runtime CLI
```

`agentctl` may also be installed inside a Sandbox as an authorized client of the host `agentd`; it remains separate
from `sessionctl`, which only operates the local Agent Runtime. Agent Home is the logical root for host control-plane
state. `AGENT_HOME` overrides it explicitly, while its default follows operating-system conventions under the
eventual product name rather than being tied to the `agentd` executable name.

The Sandbox layer is independent of Agent automation. A Node is a host machine or VM, a Sandbox is an isolated
execution environment on that Node, and an Execution is a running command inside the Sandbox.

```text
Node
└── Sandbox
    └── Executions
```

The Agent layer builds on the Sandbox layer. The Agent Control Plane manages Agents, each Agent owns a Sandbox, and
the sandbox-resident Agent Runtime owns the long-lived Sessions that contain harness state and computation.

```text
Agent Control Plane (on the host)
└── Agent (Session API, on the host)
    └── Sandbox (vsock transport)
        └── Agent Runtime (in the sandbox)
            └── Sessions
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

### Tech stack and features

- Languages:
  - Rust for the local control plane, CLI, sandbox SDK, sandbox integrations and the initial
    sandbox-resident agent runtime
  - Go for later operator/Kubernetes scheduling and orchestration
  - JavaScript plugin support may be added later through isolated subprocesses; it is not part of the
    first iteration
- Sandbox backends: Microsandbox, QEMU, more later
- Network: independently composable Network Backends connected through negotiated packet, intercepted-flow or
  versioned control-protocol endpoints
- SDKs to manage sandboxes and agents
- OCI images built from user-supplied Dockerfiles or resolved from registry references

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
- An Agent able to modify and test this platform from its own isolated repository clone
- Production-quality API foundations verified through automated tests and a manual native-platform test matrix

##### Agent layer implementation plan (temporary)

This working plan will be removed when the initial Agent deliverable is complete.

- Complete one end-to-end Agent lifecycle
  - Replace the memory-only `agentd` composition with persistent Agent state and the real Sandbox, Network,
    authorization and secret-store implementations
  - Reconcile applied Agents into retained Sandboxes, adopt them after `agentd` restarts and report useful status
  - Keep the Agent manifest declarative while keeping Sessions imperative
- Implement persistent, harness-neutral Sessions in the Agent Runtime
  - Use this public data model; the control plane assigns the UUID, and `CreateSession.workingDirectory` defaults to
    `$HOME/code` while the resulting `Session.workingDirectory` is always the resolved absolute Sandbox path:

    ```text
    CreateSession {
      initialPrompt: String
      harnessInstallation: HarnessInstallationId
      workingDirectory?: SandboxPath,
      plugins: SessionPlugin[]
    }

    Session {
      id: SessionId (UUID)
      initialPrompt: String
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

  - Keep harness-native conversation identifiers and Session Driver identifiers as opaque Adapter and Driver state,
    separate from the stable Session ID
  - Store Session metadata in SQLite through `rusqlite`, using a dedicated database thread so synchronous database
    work does not block the Tokio local runtime
  - Treat `initialPrompt` as display metadata only; read messages, responses, tool calls and other Session contents
    directly from harness-native JSONL, SQLite or equivalent storage through the selected Harness Adapter
  - Hydrate `SessionContent` on demand instead of persisting it; derive stable, Session-scoped Thread and Turn IDs from
    harness-native identifiers or deterministic storage locations
  - Represent harness-native subagents as child Threads in `SessionContent`; they remain within their owning
    Session's harness and lifecycle and are not independently managed platform Sessions
  - Submit prompts to the Session Driver without durable delivery or automatic retry; expose successfully written
    prompts as in-memory pending submissions until the Harness Adapter observes them or they expire after ten seconds
  - Replace the persisted Run API with `getSessionContent`, `submitPrompt`, `steerSession` and `interruptSession`;
    Turns are read-only harness-derived content rather than platform-managed resources
  - Allow archive, unarchive and soft delete only while a Session is `Stopped`; represent them with `archivedAt` and
    `deletedAt`, hide them from normal listings, and garbage-collect deleted Session metadata after 30 days
- Keep platform delegation separate from harness-native subagents
  - Create a real Session or Agent through `agentd` when a Session delegates work through the platform, and record the
    source Session as creation provenance without giving harness-native child Threads independent platform lifecycle
- Complete the host-side Agent API and CLI
  - Expose Agent lifecycle, Session and event operations through the versioned Agent Control API
  - Add concise Kubernetes-style `agentctl` commands and status/progress output for those operations
  - Preserve a single per-user `agentd` and host control-plane home on Linux, macOS and Windows
- Add mediated authentication and egress
  - Store provider accounts and credentials only in the host control-plane home
  - Support one-time host login and proactive token maintenance for Codex and Claude Code subscriptions
  - Mediate GitHub authentication and authorized network requests through the Network Backend and
    `sandbox-authorization`, without copying credentials into the Sandbox
  - Fail closed when authorization, secret resolution or the trusted network path is unavailable
- Prove the deliverable with a self-development Agent
  - Build an Agent image containing the required harnesses and development tools, with its own repository clone
  - Demonstrate concurrent Codex and Claude Code Sessions through the common Session API
  - Demonstrate that the Agent can modify and test this workspace, survive restarts and retain its Sessions
  - Automate backend-neutral and Linux/Microsandbox coverage, then complete the documented native-host manual matrix

## References

- agentdp, nvt-agent: prototypes of agent platforms
- Microsandbox, smolvm: implementations of microVMs and sandboxes, including networking
- herdr: agent multiplexing and parsing of harness state, such as running Claude Code or Codex CLI sessions
