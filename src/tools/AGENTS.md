# AGENTS.md — Standalone tools (`src/tools`)

Self-contained utilities used by the Studio team for deployment, releases, fleet insight, and cluster
operations. Each is independent (its own language/toolchain) and not part of the app or runtime products.

See the root [`/AGENTS.md`](../../AGENTS.md) for the wider picture. The primary developer CLI,
`studioctl`, lives separately at [`src/cli`](../cli/AGENTS.md).

## Tools

| Folder | What it is | Stack | Docs |
| --- | --- | --- | --- |
| `deployer` | Local deployment tool: a Node.js HTTP server + plain JS/HTML/CSS frontend (no build step). Only runtime dependency is the authenticated `gh` CLI. | Node.js | [deployer/AGENTS.md](deployer/AGENTS.md) |
| `releaser` | Release-automation CLI for the monorepo: changelog management, version tagging, cross-platform builds, GitHub release creation. | Go | [releaser/AGENTS.md](releaser/AGENTS.md) |
| `altinn-fleet-stats` | Statistics dashboard over deployed Altinn 3 apps (prod/tt02): clones app repos, parses structure into SQLite, browses in a UI. Single Docker container. | Python/FastAPI + React/Vite | [altinn-fleet-stats/AGENTS.md](altinn-fleet-stats/AGENTS.md) |
| `health` | CLI for running health checks/operations across Kubernetes clusters; wraps `az`/`kubectl`/`helm`/`flux` (`init`, `status`, `set-weight`, `exec`). | Go | [health/AGENTS.md](health/AGENTS.md) |

Each tool owns its own build/run instructions — open its `AGENTS.md` or `README.md`.
