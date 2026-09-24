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
installs `agentctl` and `agentd` for the current user. On Windows without Make, run `.\make-user-install.ps1` for the
same build, package and installation flow.

Maintainers updating the Microsandbox or libkrunfw forks should follow the
[downstream maintenance runbook](MICROSANDBOX.md).

User-visible changes are recorded in [CHANGELOG.md](CHANGELOG.md), which covers the whole stack and provides the
release notes for each `experimental-agent/v*` release.

The Agent database and local protocol are intentionally clean-slate while this code is experimental. Breaking schema
changes require stopping `agentd` and removing the configured Agent home rather than migrating old state.

## Architecture

```text
Host
├── agentctl             local CLI, transient execution and Session attachment
└── agentd               control plane, reconciliation, policy and SecretStore
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

`agentd` owns the durable desired state and all lifecycle effects. `agentctl` starts the adjacent daemon on demand and
communicates through the versioned local control API. Its resource-oriented commands follow `verb resource [name]`;
Session scope is explicit through `--agent` or inferred from the closest unique persisted Agent source directory.
Transient `exec` commands similarly converge the Agent first, then target its exact materialized Sandbox without
creating durable Session state or taking Sandbox lifecycle ownership away from `agentd`.

An Agent owns one retained Sandbox incarnation. The Agent controller is the sole owner of Sandbox selection,
materialization, setup, network mediation and release. A Session controller can only open the already-materialized
Sandbox and owns the in-Sandbox tmux and harness effects for that Session. Both use the same keyed reconciliation
scheduler, which serializes work per resource identity while allowing unrelated resources to progress concurrently.

Desired state is persisted before reconciliation. Wakeups provide low-latency progress, while startup and periodic
scans ensure dropped notifications or daemon restarts do not lose work. Provider assignment is sticky for an Agent
incarnation, and a reused Agent name never inherits resources from a deleted incarnation. The Sandbox is named after the
incarnation, while its guest hostname is the Agent name so shell prompts and logs identify the Agent.

Sessions have platform-assigned identities independent of tmux and harness-native conversation IDs. Each Session binds
immutably to one of its Agent's declared harness installations and to a model selection (model and effort level)
resolved at creation: the caller's explicit choice, else the installation's manifest `defaults`, else nothing, leaving
the harness's own defaults. Both values are provider-owned identifiers the platform validates but does not interpret.
The selection is recorded with the Session, shown by `agentctl get sessions`, and applied on every launch including
resume, so a later manifest change affects only new Sessions and a model change made inside the harness lasts until
the next relaunch. Detaching leaves a Session running. An inactive, unattached Session becomes Idle and is relaunched
on the next ensure or attach, resuming the harness conversation when its native state still exists. Repeated
unexpected harness exits use bounded backoff.

Tmux is the current Session runtime, not a security boundary or a permanent generic driver abstraction. A second
runtime must establish the common interface before one is introduced.

## Images, home and harnesses

See the [harness compatibility test plan](agent/HARNESSES.md) when updating harness installations.

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
Set `optional: true` when an absent host login should omit that installation instead of blocking Agent creation, so a
manifest can offer a harness that not everyone has signed in to. The check runs on every convergence, so signing in on
the host installs the harness on the next pass; until then a Session on it is refused, naming the login. The default
installation cannot usefully be optional, since it is what a Session selecting no harness gets.
Each installation may declare `defaults` with a `model` and an `effort` level for its new Sessions, in the harness's
own vocabulary. The published manifests select `model: fable` for Claude Code because a mediated token cannot list
Fable in the `/model` picker.
`spec.instructions` names one harness-neutral Agent instruction file. Every declared Harness Adapter installs that source
at its global instruction location: `~/.claude/CLAUDE.md` for Claude Code and `~/.codex/AGENTS.md` for Codex.
Repository-local instruction files continue to be discovered by the harness itself.

Harness Adapters own authentication, version verification, managed configuration, hooks, native conversation IDs and
launch arguments. The current adapters support Claude Code and Codex CLI. Harness-owned mutable state is seeded by the
image or the user and is not used as a trusted bootstrap marker.

## SSH access

`spec.access: [{type: ssh}]` gives the Agent's user OpenSSH access to the Sandbox as the platform-owned user `agent`:
`agentctl ssh <agent> [-- command]` opens it, `agentctl ssh-config install` makes the alias `agentctl-<name>`
available to plain `ssh`, `sftp` and editors that read OpenSSH configuration, and
`agentctl ssh-info <agent> -o json` describes the connection for other tools. The server listens only inside the
Sandbox and is reached through `agentctl ssh-proxy`; the image must provide OpenSSH, systemd and a usable `agent`
account, while `agentd` installs the isolated server policy and unit. `agent` has passwordless `sudo`, so an SSH
login shares the Sandbox's one trust boundary with Sessions. SSH shells, remote commands and editor servers inherit
the same image, Agent and mediated trust environment as Sandbox Executions; terminal- and Session-specific variables
remain local to their process.

## Secrets and network policy

A secret is any protected host-owned value. Credentials are the subset used for authentication. Generic storage and
mediation therefore use the `SecretStore` concept, while harness login remains an authentication concern.

`spec.environment` explicitly selects non-secret values from the same `.env` file, with `name` as both the Sandbox
variable and default source name. An optional `source` selects a differently named entry. Only declared values are
copied, and they enter the Sandbox in plaintext, where image init and Sandbox Executions inherit them. Reapplying
after changing the file updates the Sandbox environment. Do not declare secrets here.

Manifest secret bindings name a guest environment variable and the hosts where its value may be substituted. The
matching real value is loaded from the manifest directory's `.env` file, or the file named by
`agentctl apply --env-file`, and retained only in the owner-protected host database. A bind mount whose source
contains any active Agent's secret file is refused at apply time, because the Sandbox would otherwise read the real
values from the mounted directory. The Sandbox sees an inert placeholder in the named environment variable. The Network Backend substitutes
the current real value only for an authorized request to an allowed host; rotation does not require copying new
material into the Sandbox. A custom placeholder is optional for clients that validate token shape.
Set `optional: true` when a missing or empty environment-file value should omit that secret binding instead of
rejecting the Agent apply. Required secrets remain the default.

Policy is evaluated for live Sandbox-originated operations and fails closed when the destination, authorization,
secret resolution or trusted mediation path is unavailable. Host-destined traffic is restricted to the registered
Platform API endpoint. This authorization is separate from authorization of users calling the host Agent API.
When an Agent image includes Podman, the platform makes the guest's mediated CA bundle available to containers and
build steps through standard trust paths. An OCI hook copies the bundle into the container root filesystem rather
than bind-mounting it, so package managers can still replace the bundle, and it adds the mediator CA as a trust
anchor so a regenerated bundle keeps trusting mediation. Docker and dockerd are not covered by this convenience
wiring.

SQLite `secure_delete` and owner-only filesystem permissions provide local hygiene. They are not a cryptographic
erasure guarantee across WAL history, filesystem snapshots or backups.

## Current scope and direction

The current milestone provides persistent Agents and Sessions, real Microsandbox lifecycle, mediated harness and GitHub
authentication, image-owned workspace initialization, idle/resume behavior, local packaging and release-pinned runtime
downloads.

Important current limitations are:

- Codex uses a separate ChatGPT subscription login owned and refreshed by `agentd`;
- Sessions share one Sandbox user and tmux server and therefore one trust boundary;
- attachment is still a client-side Provider operation rather than a daemon-owned terminal capability;
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
