# Agent platform

This area explores an open agent platform built on a reusable Sandbox SDK. The platform is designed to run locally
or under later cloud orchestration without coupling Agent automation to one isolation backend, network implementation,
harness or model.

The main goals are:

- long-running Agents with multiple durable Sessions;
- strong isolation with mediated network access and no real secrets inside Sandboxes;
- backend-neutral Sandbox lifecycle, execution, storage, file-transfer and terminal APIs;
- harness-neutral Agent and Session concepts with harness-specific behavior kept in adapters;
- host APIs that work on Linux, macOS and Windows while initially materializing Linux Sandboxes; and
- a Sandbox layer reusable by CI runners and other isolated workloads that do not depend on Agent concepts.

## Development

Run `make help` from this directory for the supported development commands. `make user-install` builds, packages and
installs `agentctl` and `agentd` for the current user.

The Agent database and local protocol are intentionally clean-slate while this code is experimental. Breaking schema
changes require stopping `agentd` and removing the configured Agent home rather than migrating old state.

## Architecture

```text
Host
├── agentctl             CLI, terminal input/output and interactive UI
└── agentd               control plane, runtime operations, policy and SecretStore
    └── Agent            declarative durable resource
        └── Sandbox      isolated execution environment
            ├── Session  durable tmux-backed harness process
            └── Session  durable tmux-backed harness process
```

The implementation has two deliberately separate layers.

### Sandbox layer

`sandbox` is the generic Rust SDK. A Node hosts Sandboxes, and Sandboxes host Executions. Providers pair a Sandbox
Backend with an Image Backend and advertise platform capabilities before selection. Network Backends are selected
independently and consume a negotiated packet, intercepted-flow or versioned-control endpoint.

`sandbox-microsandbox` implements the Sandbox, Image and Network contracts for Microsandbox. Network enforcement and
secret substitution happen on the trusted mediation path; the Sandbox Backend must not leave an unobserved egress
path. `sandbox-authorization` defines the context-aware authorization vocabulary without depending on the Agent
control plane or an enforcement implementation.

The Sandbox crates do not depend on Agent automation.

### Agent layer

`agentd` owns the durable desired state and all lifecycle effects. `agentctl` communicates through the versioned Agent
Control API. Its built-in `local` context uses the protected platform-local socket and starts the adjacent daemon on
demand. Named TCP contexts connect to an already-running daemon and never start or fall back to a local process. The
resource-oriented commands follow `verb resource [name]`; Session scope is explicit through `--agent` or inferred from
the closest unique persisted Agent source directory. `agentd` owns all Sandbox access, including transient executions,
terminal attachments and host listeners for port forwarding. `agentctl` carries their transport-neutral streams and
owns only local terminal input/output and UI state.

An Agent owns one retained Sandbox incarnation. The Agent controller is the sole owner of Sandbox selection,
materialization, setup, network mediation and release. A Session controller can only open the already-materialized
Sandbox and owns the in-Sandbox tmux and harness effects for that Session. Both use the same keyed reconciliation
scheduler, which serializes work per resource identity while allowing unrelated resources to progress concurrently.

Desired state is persisted before reconciliation. Wakeups provide low-latency progress, while startup and periodic
scans ensure dropped notifications or daemon restarts do not lose work. Provider assignment is sticky for an Agent
incarnation, and a reused Agent name never inherits resources from a deleted incarnation.

Sessions have platform-assigned identities independent of tmux and harness-native conversation IDs. Each Session binds
immutably to one of its Agent's declared harness installations. Detaching leaves a Session running. An inactive,
unattached Session becomes Idle and is relaunched on the next ensure or attach, resuming the harness conversation when
its native state still exists. Repeated unexpected harness exits use bounded backoff.

Tmux is the current Session runtime, not a security boundary or a permanent generic driver abstraction. A second
runtime must establish the common interface before one is introduced.

### Client contexts and host-native daemons

Contexts allow `agentctl` to run in a container while `agentd` runs natively on a host with the required virtualization
support. With no client configuration, behavior is unchanged and the implicit `local` context is used. Named endpoints
are managed with `agentctl config get-contexts`, `set-context`, `use-context` and `delete-context`; `--context` selects
one endpoint for a command. Configuration is stored in `$HOME/.agentctl/config.yaml` on Unix and
`%USERPROFILE%\.agentctl\config.yaml` on Windows, with `AGENT_CONFIG` as an override.

For trusted local development, `agentd --insecure-tcp-port PORT` additionally listens on `127.0.0.1`. This listener is
deliberately unauthenticated and unencrypted. Docker Desktop may make it reachable to containers, so any process that
can reach the port can control the daemon and potentially cause it to access host paths. It is disabled by default and
must not be exposed on a wildcard address. Authentication will be provided by a separate TLS endpoint later.

Resource commands, `exec`, `attach`, `port-forward` and the TUI use the same Control API over every Connector. Streaming
operations upgrade their request connection and end when the operation completes or `agentctl` disconnects. Harness
login remains disabled for insecure TCP because it would expose a bearer credential. A future SSH Connector can proxy
the remote Unix socket without changing the Control API or command implementations. Port-forward addresses are bound
on the `agentd` host. Host paths sent by `apply` or current-directory inference must exist at the same absolute path on
the daemon host.

## Images, home and harnesses

Agent images own installed tools and optional workspace initialization. Repository checkouts are persistent runtime
data beneath `/home/agent/code`; they are not declared, updated or deleted by the Agent controller. Sessions may clone
repositories they can access, and image init may make a simple best-effort checkout for convenience.
`spec.sandbox.mounts` can instead attach caller-owned host directories or temporary memory filesystems when the selected
Sandbox Provider supports them; these attachments are immutable for the Agent incarnation.

`spec.home` is a continuously applied overlay onto `/home/agent`. It converges files supplied by the builder but does
not delete guest files that disappear from the source. Builders may use it to own harness configuration explicitly,
with the consequence that those files are reapplied on every Agent pass.

`spec.harnesses` declares the harness installations available to Sessions and selects the default used for new Sessions.
A declared `version` is verified against the image at setup; omit it when the image owns the version, so image bumps need no manifest change.
`spec.instructions` names one harness-neutral Agent instruction file. Every declared Harness Adapter installs that source
at its global instruction location: `~/.claude/CLAUDE.md` for Claude Code and `~/.codex/AGENTS.md` for Codex.
Repository-local instruction files continue to be discovered by the harness itself.

Harness Adapters own authentication, version verification, managed configuration, hooks, native conversation IDs and
launch arguments. The current adapters support Claude Code and Codex CLI. Harness-owned mutable state is seeded by the
image or the user and is not used as a trusted bootstrap marker.

## Secrets and network policy

A secret is any protected host-owned value. Credentials are the subset used for authentication. Generic storage and
mediation therefore use the `SecretStore` concept, while harness login remains an authentication concern.

Manifest secret bindings name a guest environment variable and the hosts where its value may be substituted. The
matching real value is loaded from the manifest directory's `.env` file and retained only in the owner-protected host
database. The Sandbox sees an inert placeholder in the named environment variable. The Network Backend substitutes
the current real value only for an authorized request to an allowed host; rotation does not require copying new
material into the Sandbox. A custom placeholder is optional for clients that validate token shape.

Policy is evaluated for live Sandbox-originated operations and fails closed when the destination, authorization,
secret resolution or trusted mediation path is unavailable. Host-destined traffic is restricted to the registered
Platform API endpoint. This authorization is separate from authorization of users calling the host Agent API.
When an Agent image includes Podman, the platform makes the guest's mediated CA bundle available to containers and
build steps through standard trust paths. Docker and dockerd are not covered by this convenience wiring.

SQLite `secure_delete` and owner-only filesystem permissions provide local hygiene. They are not a cryptographic
erasure guarantee across WAL history, filesystem snapshots or backups.

## Current scope and direction

The current milestone provides persistent Agents and Sessions, real Microsandbox lifecycle, mediated harness and GitHub
authentication, image-owned workspace initialization, idle/resume behavior, local packaging and release-pinned runtime
downloads.

Important current limitations are:

- Codex uses a separate ChatGPT subscription login owned and refreshed by `agentd`;
- Sessions share one Sandbox user and tmux server and therefore one trust boundary;
- the optional development TCP listener has no authentication or encryption and must remain inside a trusted development boundary;
- Session content, prompt steering, archive/delete and plugin APIs are not implemented; and
- global scheduling and Kubernetes orchestration are future work.

The next planned slices are:

1. expose harness-native Session content and prompt/steer/interrupt operations;
2. add Session lifecycle operations such as archive and soft deletion;
3. add an authorized Sandbox-facing Platform API for delegation and isolated host plugins; and
4. add global orchestration only after the local control-plane contracts are proven.

## References

- agentdp and nvt-agent: earlier agent-platform prototypes
- Microsandbox and smolvm: microVM and Sandbox implementations
- Herdr: harness multiplexing and native session-state exploration
