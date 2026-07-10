# AGENTS.md — Altinn Studio Fleet Statistics (`src/tools/altinn-fleet-stats`)

A statistics dashboard over the **fleet of deployed Altinn 3 apps** (prod / tt02). It clones app repos,
parses their structure into a SQLite database, and lets you browse the results in a UI. Used by the UX
team locally.

One of the standalone [tools](../AGENTS.md). Full (Norwegian) docs: [`README.md`](README.md).

## Stack

Full stack packaged in a single Docker container:

- **Backend** — Python 3.12 / FastAPI (clones repos, parses app structure into SQLite, streams progress
  via SSE).
- **Frontend** — React 18 / Vite / TypeScript / Tailwind / Recharts, served statically by the backend.
- Runs on port `9091`.

## Working here

- Internal analysis tool, not a product service.
- Keep the parsing logic resilient to the variety of real app structures it clones and reads.
