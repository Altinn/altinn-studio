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

The core ownership model is:

```text
Node hosts Sandboxes

Agent
└── owns one Sandbox
    └── runs one Agent Runtime
        └── owns many Sessions
            └── each Session executes Runs

CI Runner Coordinator
└── creates an ephemeral Sandbox
    └── starts a runner Execution from the image entrypoint
```

Authorization is cross-cutting rather than specific to networking:

```text
Principal requests Action on Resource with Authorization Context
                              │
                    Authorization Policy Engine
                              │
                  Authorization Decision
                              │
               Trusted Policy Enforcement Point
```

The platform uses these terms consistently:

| Concept | Meaning |
| --- | --- |
| Node | A machine or VM on which the Operator schedules Sandboxes. |
| Host Platform | The operating system and architecture on which a Sandbox Backend and control plane run. |
| Sandbox | A generic isolated execution environment with no agent or CI semantics. |
| Sandbox Name | A caller-provided stable lookup key. A retained Sandbox keeps its name across re-adoption. |
| Sandbox ID | A lifecycle-assigned UUID identifying one materialization. Deleting and recreating the same Sandbox Name produces a new ID; backend-native identifiers remain private. |
| Sandbox Platform | The operating system, architecture and compatibility requirements visible inside a Sandbox. It is independent of the Host Platform. |
| Image Platform | The concrete Sandbox Platform selected from an OCI image and pinned with its digest. |
| Agent | A persistent logical worker represented by a declarative resource. It owns one Sandbox in the first iteration. |
| Agent Runtime | The sandbox-resident control process that owns Sessions and their state. It is not a harness or model. |
| Session | A long-lived, harness-backed work context owned by an Agent Runtime. It is not coupled to a repository or worktree. |
| Run | One addressable execution of a queued prompt within a Session. |
| Prompt | The initial input that creates a Run; additional input to the active Run is steering. |
| Task | Reserved for future higher-level automation that may span several Runs, Sessions or Agents. |
| Sandbox SDK | The backend-neutral interface used by agent automation, CI and other higher layers. |
| Sandbox Provider | A coherent Sandbox Backend and Image Resolver pair that shares one image materialization domain. Consumers select a Provider rather than wiring those implementation details independently. |
| Sandbox Backend | An implementation of core Sandbox lifecycle, execution, runtime file transfer, storage and mount behavior, such as Microsandbox. |
| Sandbox Handle | The consumer API for one ready Sandbox. It owns lifecycle policy and exposes execution, file-transfer and inspection operations without exposing Backend authority. |
| Sandbox Feature | Optional functionality reported by a Sandbox Backend or another Sandbox SDK interface, such as file transfer, persistent volumes, terminal execution or nested containers. Mount kinds and root-filesystem modes are reported separately. |
| Execution | A live addressable command inside a Sandbox, including the image's default OCI entrypoint and command. Output is streamed while the Execution is active; it is not durable Session state. |
| Terminal Execution | A live Execution with bidirectional terminal input, merged output and resize control. It may use a PTY or another platform-specific terminal mechanism and is not an Agent Session. |
| Terminal Attach | An optional Backend operation that connects the caller's current terminal to an interactive Execution until it exits or detaches. |
| Image | The immutable base root filesystem and OCI configuration used to create a Sandbox. |
| Image Source | Either a Dockerfile build context or an OCI registry reference resolved to an immutable Image digest for Sandbox creation. |
| Resource Quantity | A positive, fixed-point CPU or byte value using Kubernetes syntax, such as `500m`, `8Gi` or `64Gi`. |
| Volume | Mutable storage with a lifecycle independent of the Sandbox image. |
| Mount | A Volume, tmpfs or bind attachment inside a Sandbox. |
| Network Backend | An independently selected implementation of Sandbox networking and enforcement. It consumes a Network Endpoint and may use `sandbox-authorization` without depending on a particular Sandbox Backend. |
| Network Attachment | The immutable association between one Sandbox, its selected Network Backend and the negotiated endpoint contract. A live endpoint may reconnect across stops and restarts without replacing the attachment. |
| Network Endpoint | An owned boundary negotiated between a Sandbox Backend and Network Backend: raw Ethernet/IP packets, intercepted TCP streams and UDP datagrams, or a jointly implemented versioned control protocol. |
| Network Interface Configuration | Immutable MAC address, MTU, IPv4/IPv6 addresses and prefixes, default gateways and DNS servers chosen and persisted by a Sandbox Backend for a packet endpoint. |
| Principal | The authenticated Agent, Sandbox, Session or Execution on whose authority an Action originating in a Sandbox is requested. |
| Action | A requested operation originating in a Sandbox, such as connecting to a destination, using a secret, pushing to a repository or invoking a tool. |
| Resource | The target of an Action, such as an external service, secret, repository or tool. |
| Authorization Context | Trusted information relevant to a decision, such as the Agent, Session, Run, environment, destination or delegation chain. |
| Authorization Request | A Principal, Action, Resource and Authorization Context submitted for evaluation. |
| Authorization Policy | Rules defining which Authorization Requests are permitted. |
| Authorization Policy Engine | Evaluates Authorization Requests without performing the requested Actions. |
| Authorization Decision | Allows or denies a request. Domain-specific details belong in the Request and its trusted Context, not in untyped response constraints. |
| Policy Enforcement Point | A trusted component that obtains and enforces an Authorization Decision before performing an Action. |
| Secret Store | Host-only storage that returns opaque Secret References and resolves current secret material only for trusted host mediators. |
| Credential Mediation | A trusted host Policy Enforcement Point that resolves Secret References only after authorizing their use and never exposes credentials to the requester or Sandbox Backend. |
| Agent Control Plane | Host-side desired state, persistence, reconciliation and Agent Runtime management, implemented locally by `agentd`. |
| Agent Control API | The client-facing API used by `agentctl` and future desktop, web and remote clients. |
| Agent Runtime Protocol | The agent-specific protocol between the Agent Control Plane and Agent Runtime. |
| Harness | A supported agent tool family, such as Codex or Claude Code. |
| Harness Installation | A particular installed harness executable and version available in a Sandbox. |
| Harness Adapter | Harness-specific translation of lifecycle, state, prompts, steering and events. |
| Session Driver | The mechanism used to operate a Session, such as a PTY, tmux or a direct protocol. |
| Control Lease | The exclusive right for one client to steer an interactive Session while other clients may continue observing. |
| Provider Account | A host-side subscription identity, distinct from a Harness Installation and model selection. |
| Operator | The future global/cloud scheduler and orchestrator for Nodes and Sandboxes. |
| Runner Coordinator | A CI-specific higher layer that creates ephemeral Sandboxes and manages runner registration and lifecycle. |

Implementation roles follow the same distinction: a Backend implements infrastructure, an Adapter translates
an external product, a Driver operates a mechanism, a Transport carries bytes, a Protocol gives those bytes
meaning, a Service coordinates operations within one layer, a Resolver selects immutable inputs, a Controller runs
a continuous loop, a Reconciler converges one resource, a Coordinator manages a workflow across resources, and an
Operator schedules globally. Plugins, if introduced later, extend the Agent Runtime rather than the generic Sandbox
layer.

The Rust workspace enforces these boundaries:

```text
sandbox <- sandbox-microsandbox

sandbox-authorization

sandbox ----------------\
agent-runtime-protocol --+--> agent

agent-runtime-protocol --> agent-runtime
```

The generic Sandbox SDK has no dependency on Agent automation or Microsandbox. The sandbox-resident Agent Runtime
has no dependency on the host Control Plane or a concrete Sandbox implementation. `sandbox-authorization` is a
foundational contract scoped to Sandbox-originated operations, but it has no dependency on the Sandbox SDK,
enforcement points or the Agent Control API. Network Backend implementations will consume it; the generic network
lifecycle and endpoint contracts remain authorization-agnostic.

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

#### First iteration

- Strict layering across `sandbox`, `sandbox-authorization`, `sandbox-microsandbox`, `agent-runtime-protocol`,
  `agent-runtime` and the host-side `agent` crate
- SDK-driven generic sandbox lifecycle for uses such as CI; the higher agent layer provides a declarative
  `Agent` resource that owns exactly one sandbox
- Consumers discover the configured surface through `SandboxService`, provision through a Sandbox Provider and
  operate the resulting Sandbox Handle; Backend traits remain the implementation-facing interface for providers
- The Agent manifest keeps agent settings in `spec` and generic sandbox settings in `spec.sandbox`; the latter
  maps directly to the sandbox SDK, while sessions are created through the API and do not appear in the manifest
- A Sandbox Backend owns lifecycle, execution, runtime file transfer, storage and mount behavior
- Backends report mount kinds and root-filesystem modes separately from optional Sandbox Features, allowing the
  service to reject unsupported materialization requests before creation
- Execution IDs are assigned before dispatch by the Sandbox SDK; execution output and metadata remain transient
- Sandbox ensure, Backend lifecycle work and Image resolution use the same observable operation convention: callers
  stream progress until one successful result or terminal error, or await the operation when progress is unnecessary
- CPU, memory and writable root-filesystem capacity are mutable desired Sandbox resources expressed as
  Kubernetes-style quantities and reconciled by the selected Backend; a Backend rejects values or transitions it
  cannot represent exactly. The immutable root-filesystem mode selects a shared layered Image or a fully
  materialized direct filesystem for workloads such as nested container engines
- A Sandbox Backend reports its Network Endpoint capabilities; an independently selected Network Backend chooses a
  compatible raw Ethernet/IP packet endpoint, intercepted TCP/UDP endpoint or jointly implemented versioned control
  protocol and owns enforcement
- Packet endpoints carry immutable, backend-neutral interface configuration: Sandbox MAC address, MTU, IPv4/IPv6
  addresses and prefixes, default gateways, DNS servers and maximum frame length. The Sandbox Backend chooses and
  persists it; the Network Backend consumes it without deriving backend-private addresses
- Raw packets and intercepted datagrams use bounded poll-based batches with explicit backpressure; endpoint drivers
  are `Send`-capable so data-plane work can move off the single-threaded control plane
- The selected endpoint is the complete egress boundary: traffic it does not represent is blocked by the Sandbox
  Backend rather than bypassing the Network Backend. HTTP, WebSocket, TLS, DNS, QUIC and other semantic processing
  belongs either to the Network Backend or to a trusted Sandbox runtime represented by the negotiated control
  protocol
- The first Microsandbox control protocol reports DNS queries, transport connections and complete HTTP/1 or HTTP/2
  requests before forwarding them. Its controlled endpoint enables TLS interception so HTTPS requests follow the
  same `http.request` authorization path; query data is not included in policy context
- Credential mediation extends Microsandbox's native `SecretEntry`/`SecretInjection` engine with deferred `store`
  sources. The trusted runtime authorizes `http.request` and each native `secret.use`, then obtains current material
  for that request only. The first adapter enables intercepted-TLS headers and Basic authentication for HTTP/1 and
  HTTP/2; mediated body injection is rejected until the native streaming path can pause for host authorization
- The Microsandbox SDK owns Unix-socket or Windows named-pipe binding, framing, reconnection and cleanup for this
  protocol; the Sandbox Backend adapter handles bounded complete messages without platform-specific IPC plumbing
- Any compatible Sandbox and Network Backend can be composed; `sandbox-microsandbox` will implement both traits
  separately even when both implementations dispatch to the same Microsandbox runtime
- The selected Network attachment is immutable and recorded when the Sandbox is created; its live endpoint and
  Network Backend processing stop and reconnect with the Sandbox lifecycle
- The Sandbox contract and Agent manifest contain no `NetworkPolicy`; live access decisions belong to
  `sandbox-authorization` and are enforced by the Network Backend
- Runtime file transfer streams individual regular files between the host and a running sandbox without changing
  its Image; host-path helpers build on backend-neutral byte streams
- An Image Source is either a Dockerfile plus build context or an OCI registry reference; Dockerfile contexts are
  resolved relative to the applied manifest and built through a configured Docker Engine-compatible API
- `spec.sandbox.platform` explicitly requests open, OCI-aligned operating-system and architecture values; the
  image is resolved for that Platform and its resulting OCI metadata must satisfy the request
- Sandbox Platform is immutable and separate from optional Sandbox Features; image validation and capability
  discovery are platform-aware so a future Backend can materialize Windows as well as Linux sandboxes
- Build or pull the OCI image when creating a Sandbox, record its source provenance and pin the resulting digest;
  both the Image Source and resolved digest are immutable until the Sandbox is deleted and created again
- The immutable Sandbox init selection either retains the Backend's built-in PID 1 or hands initialization to an
  init system supplied by the Image
- Deployment-specific adapters materialize source inputs and transform manifests; the local control plane
  remains unaware of Kubernetes, ConfigMaps, volume types and other runtime-environment details
- Run the local control plane and Sandbox SDK on current Linux, Apple Silicon macOS and Windows hosts, verified
  with a manual native test matrix; the first Microsandbox Backend materializes Linux sandboxes only
- Manifest-driven, continuously reconciled desired state for agents, with Kubernetes-style CLI semantics;
  sessions remain imperative in the first iteration and may become declarative later
- Agent API writes return after storing desired state; generations and conditions distinguish requested,
  sandbox-ready and agent-runtime-ready state
- A long-running per-user local control-plane daemon, started on demand by the CLI, owns reconciliation,
  persistent state and token maintenance; after a host reboot reconciliation waits for the next CLI invocation
- One daemon per control-plane home, guarded by a process lock; alternate homes provide isolated development
  and test instances
- A versioned JSON-RPC 2.0 Agent Control API using JSONL over Unix-domain sockets for the local CLI, with later
  desktop, web and remote clients preserving the same semantics
- Local API access relies on per-user socket-directory permissions and Windows ACLs without another bearer token
- Context-aware authorization applies only to operations originating inside Agents and Sandboxes, using Principal,
  Action, Resource and trusted Context; platform-user authorization for the Agent Control API is a separate concern
- Authorization Context values are typed and trusted request producers share a built-in vocabulary for network and
  secret-use actions while remaining free to add namespaced domain-specific values
- Sandbox-originated actions such as `network.connect`, `http.request` and `secret.use` are Authorization Requests
  evaluated by the foundational policy engine and enforced by the trusted network implementation
- Authorization policy can change while a Sandbox is running; new operations use the latest decision and the
  enforcement path can revoke already-active flows
- Keep the versioned JSON-RPC 2.0/JSONL Agent Runtime Protocol independent of its connection mechanism; select that
  mechanism only when implementing the concrete host-to-Agent-Runtime integration
- A dedicated host-side control-plane home stores manifests, image provenance, runtime state and secrets
- Long-lived sandboxes, sessions and sandbox-local repositories; `spec.sandbox.retentionPolicy` retains the
  stopped sandbox by default or explicitly deletes it
- A retained Sandbox keeps `$HOME`, repositories, configuration and native harness session state in its writable
  root filesystem; use a Volume only when storage needs a lifecycle independent of the Sandbox
- Sessions start in `$HOME` or `$HOME/code`; repository and worktree conventions are use-case-specific and
  provided through `AGENTS.md` guidance rather than coupled to session lifecycle
- One or many sessions per sandbox, with concurrency chosen by the user based on workload and sandbox capacity
- The agent layer resolves a versioned Agent Runtime bundle to materialized host content and supplies it to
  the Sandbox SDK as a read-only bind at a fixed sandbox path
- The control plane selects a compatible Agent Runtime bundle directly from `spec.sandbox.platform` before the
  image is resolved; the Agent manifest does not select a runtime version
- Pin the selected Agent Runtime bundle version when creating or recreating a sandbox; control-plane upgrades do not
  silently change existing sandboxes
- The Sandbox starts from the resolved Image's OCI configuration after attaching its mounts; setup and long-running
  services belong in the Image, while higher layers can use the Execution API for explicit post-start work
- A sandbox-resident Agent Runtime that owns multiple long-lived Sessions and all of their state
- Defer JavaScript plugins; if added later, run them as subprocesses behind a versioned protocol rather
  than embedding a JavaScript engine in the agent runtime
- A stable, harness-neutral Session API for lifecycle, state, events, queued Runs and live steering, with
  replaceable Harness Adapters and Session Drivers and optional features such as PTY-backed terminal streaming
- Select an installed harness when creating each session, allowing one sandbox to run sessions across multiple
  harness installations without an Agent-wide default harness
- Separate normalized Session lifecycle from addressable Run state
- Outer control planes and clients only manage and interact with sandbox-owned Sessions; one client holds the
  Control Lease at a time while multiple clients can observe
- Logical Sessions survive Sandbox or Agent Runtime restarts by resuming persisted native harness sessions
- An Altinn Studio agent able to modify and test the agent platform itself from its own isolated clone
- Single-user local authentication with one Codex and one Claude subscription identity shared by all
  sandboxes after logging in once per provider on the host
- Host authentication invokes supported host-installed Codex CLI and Claude Code versions using isolated
  provider state under the control-plane home
- An internal, generic host-side secret-store API owns opaque entries created by provider and GitHub login;
  manifests and backend configuration contain references only
- Microsandbox credential bindings are configured per Sandbox name and resolved against current Secret Store values
  for each authorized use
- An owner-only file-backed store under the control-plane home for the first iteration (`0600` on Unix and an
  equivalent ACL on Windows), with replaceable storage backends later
- Maintain a minimal Microsandbox fork, intended for upstreaming, with an opt-in, fail-closed Network control protocol
  between its trusted network runtime and the independently selected host Network Backend. Standalone Microsandbox
  behavior remains unchanged when that mode is not selected
- The Agent stack never places a real credential, including a short-lived access token, in an Agent's Sandbox or
  persisted backend configuration; independent Sandbox SDK consumers may deliberately choose different mounts
- Proactively maintain provider tokens; missing or failed authentication leaves resources accepted with
  `AuthReady=False`, pauses queued prompts and fails an active prompt without automatically replaying it
- Pin and support tested Codex CLI and Claude Code versions through version-specific harness adapters
- Mediated GitHub authentication so agents can push branches and create pull requests
- Begin with a control-plane-configured allow-all or deny-all authorization default; do not add a declarative rule
  language until the real enforcement inputs are understood
- Linux sandbox users have passwordless root inside the Sandbox and can use normal development tools, including
  nested container engines, tracing and profiling

## References

- agentdp, nvt-agent: prototypes of agent platforms
- Microsandbox, smolvm: implementations of microVMs and sandboxes, including networking
- herdr: agent multiplexing and parsing of harness state, such as running Claude Code or Codex CLI sessions
