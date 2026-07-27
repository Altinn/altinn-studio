# AGENTS.md — Shared contracts (`src/Shared`)

Cross-language shared contracts that must stay consistent between the .NET and Go sides of the local
dev tooling. The C# sources here are **compiled directly into `studioctl-server`** (see
[`src/cli`](../cli/AGENTS.md)) via `<Compile Include="../../Shared/...">` links, and each contract has a
Go counterpart on the studioctl side. When you change a contract here, update the Go side to match — the
exact Go location differs per contract (noted below).

See the root [`/AGENTS.md`](../../AGENTS.md) for the wider picture.

## Contracts

### `EnvTopology/`

C# model/config classes (namespace `Altinn.Studio.EnvTopology`) describing "bound topology" routing —
app route templates, routes, destinations, match rules, metadata, plus configuration extensions and
index accessors. Defines the shared environment-routing/topology contract.

- Go counterpart: `src/cli/internal/envtopology/`.

### `HostBridge/`

C# definitions (namespace `Altinn.Studio.HostBridge`) for the HostBridge WebSocket tunnelling protocol:

- `HostBridgeProtocol.cs` — binary frame kinds and request/response/body/error frame records; defaults
  such as the `/internal/host-bridge` endpoint, 64 KiB frame size, and dev-server port 8080.
- `HostBridgeHttpHeaders.cs` — hop-by-hop / content header filtering.

Used to proxy HTTP traffic between the local `studioctl-server` and a host over a WebSocket.

- Go counterpart: not a single package — the client/transport side lives in
  `src/cli/internal/studioctlserver/client.go` and the server wiring in `src/cli/internal/cmd/server.go`
  (keep frame kinds, defaults, and header filtering in sync with `HostBridgeProtocol.cs`).

## Convention

These are contract definitions, not services — keep them small, dependency-light, and in lockstep with
their Go counterparts. There are no separate leaf `AGENTS.md` files under this folder; document changes
here.
