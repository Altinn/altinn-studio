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

The Sandbox layer is independent of Agent automation. A Node is a host machine or VM, a Sandbox is an isolated
execution environment on that Node, and an Execution is a running command inside the Sandbox.

```text
Node
└── Sandbox
    └── Executions
```

The Agent layer builds on the Sandbox layer. The Agent Control Plane manages Agents, each Agent owns a Sandbox, and
the sandbox-resident Agent Runtime owns the long-lived Sessions and Runs that contain harness state and computation.

```text
Agent Control Plane
└── Agent
    └── Sandbox
        └── Agent Runtime
            └── Sessions
                └── Runs
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

## References

- agentdp, nvt-agent: prototypes of agent platforms
- Microsandbox, smolvm: implementations of microVMs and sandboxes, including networking
- herdr: agent multiplexing and parsing of harness state, such as running Claude Code or Codex CLI sessions
