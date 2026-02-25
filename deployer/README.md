# Deployer

A local web dashboard for monitoring and approving Altinn Studio deployments across environments and rings.

The GitHub Actions UI becomes impractical when many services are deploying to many environments simultaneously — it is just a flat list of runs with no cross-service view. Deployer provides a grid of services × environments showing what is currently deployed and what is next, with direct in-browser approval.

## Usage

```bash
make run
```

Opens automatically in the browser at `http://localhost:3456`.

Requires the [GitHub CLI](https://cli.github.com/) (`gh`) to be installed and authenticated.

## Features

- Grid view: services (rows) × environments (columns)
- Split cells: left half = currently deployed, right half = next/latest candidate
- Status indicators: deployed, deploying (spinner), awaiting approval, queued, failed
- Approve deployments directly from the UI — single or multi-select (`<space>` shortcut to mark for approval)
- Only shows approve controls for environments where the current user is an authorized reviewer
- Auto-refreshes every 10s; active jobs (queued/in-progress) are polled every 10s server-side
- Stores runs and jobs in sqlite and tries to minimize gh API traffic

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `REPO` | `Altinn/altinn-studio` | GitHub repository |
| `PORT` | `3456` | HTTP port |

## Architecture

- `server.js` — HTTP server, GitHub sync worker, approve endpoint
- `db.js` — SQLite schema and prepared statements (via Node.js built-in `node:sqlite`)
- `gh.js` — `gh` CLI wrapper with concurrency limiting
- `app.js` — Browser-side rendering and interaction
- `browser.js` — Cross-platform browser opener

Data is stored in `deployer.db` (SQLite). Delete the file to reset state.
