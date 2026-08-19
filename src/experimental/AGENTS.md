# AGENTS.md

This area contains the experimental agent platform described in `README.md`.

## Architecture

- `sandbox` is the generic Rust SDK for Sandbox lifecycle, features, images, storage, runtime file
  transfer, execution, Network Backends and secret storage. It must not depend on Agent
  automation or a concrete Sandbox implementation.
- `sandbox-microsandbox` contains the Microsandbox Backend and network enforcement implementation. It depends on
  `sandbox`, never the reverse.
- `sandbox-authorization` contains context-aware authorization contracts and policy-engine interfaces for operations
  originating inside Agents and Sandboxes. The name communicates its scope; it must not depend on enforcement
  points, the Agent Control Plane or the Sandbox SDK.
- `agent-runtime-protocol` contains the versioned wire types shared by the Agent Control Plane and
  sandbox-resident Agent Runtime.
- `agent-runtime` owns sandbox-resident Session and Run state, Harness Adapters and Session Drivers. It
  must not depend on the host Agent Control Plane or a concrete Sandbox implementation.
- `agent` owns Agent resources, the host Control Plane, Agent Control API, platform-specific runtime
  bundle selection, `agentd` and `agentctl`. It builds on the lower crates above.
- The backend owns Sandbox lifecycle, execution, runtime file transfer, storage and mount behavior; do not split
  those into speculative replaceable component traits.
- A Network Backend is independently selectable from a Sandbox Backend. They negotiate an owned Network Endpoint:
  raw Ethernet/IP packets, intercepted TCP streams and UDP datagrams, or a jointly implemented versioned control
  protocol. The Network Backend consumes the endpoint and owns host authorization and endpoint driving; a trusted
  Sandbox runtime may perform protocol-aware enforcement only through the negotiated control protocol. Packet,
  datagram and control-message data planes use bounded batch polling rather than per-item futures. Packet endpoints
  carry immutable interface configuration chosen and persisted by the Sandbox Backend. Microsandbox implements both
  traits separately even when both dispatch to the same runtime. Concrete Backend SDKs own platform-specific local
  IPC binding, framing and cleanup; the generic endpoint adapter handles complete bounded messages.
- The Network Backend identity and selected endpoint contract are recorded when a Sandbox is created and are
  immutable for its lifetime. Network start, stop and reconnection follow Sandbox lifecycle without changing that
  attachment. A Sandbox Backend must block traffic not represented by the selected endpoint; it must never become an
  unobserved egress path.
- Do not add a `NetworkPolicy` to the Sandbox contract or manifest. Network implementations use
  `sandbox-authorization` for live Sandbox-originated decisions.
- Do not use authorization intended for Sandbox-originated operations to authorize platform users calling the
  Agent Control API. That is a separate concern.
- The host-to-Agent-Runtime connection mechanism is not selected. Do not add a generic Sandbox control channel
  until a concrete Agent Runtime integration demonstrates the required contract.
- Agent-stack secrets remain on the trusted host and use mediated access. The independent Sandbox SDK may expose
  caller-selected bind mounts for other products and trusted local workflows; it does not impose Agent policy.

Use crate boundaries for architectural separation and modules for internal organization. Add another crate
only when a component needs an independent dependency, versioning or distribution boundary. Do not add
`sandboxd` or `sandboxctl` unless the generic Sandbox SDK gains an independent process boundary.

Use Tokio's `LocalRuntime` for asynchronous work. Keep control-plane state single-threaded and use `Rc`,
`Cell`, or `RefCell` as appropriate. Do not use `Arc` or `Mutex`.

## Development

```sh
make build
make fmt
make lint
make test
make check
make check-platforms
```

`make check` runs formatting checks, strict Clippy analysis, builds, and tests for the Rust workspace.
`make check-platforms` runs Clippy over the portable crates' Windows and macOS code after their Rust
standard-library targets are installed. Concrete Backends still require the documented native test matrix.
