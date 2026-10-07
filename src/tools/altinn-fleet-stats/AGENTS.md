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

## The interface catalog

The **Grensesnitt** tab pairs a catalog of the Altinn.App libraries' public interfaces with the usage
the scanner finds in the apps' own C# code, so the team can see which parts of the extension surface
are actually used.

- `backend/altinn_fleet/data/interface_catalog.json` is **generated and committed**. It is built by
  `backend/scripts/generate_interface_catalog.py` from the app libraries' committed public-API
  snapshots (`src/App/backend/test/*/PublicApiTests.*.verified.txt`) plus their source, which supplies
  the XML doc summary and the `[ImplementableByApps]` marking. Regenerate it when the library's public
  API changes; `--check` fails when the committed file is stale.
- `backend/altinn_fleet/csharp.py` reads app code with regexes over comment-stripped source. Apps in
  the fleet span every library version back to the first Altinn 3 release and never compile here, so
  tolerance beats precision — a reader that copes with unknown shapes is the point.
- The catalog also carries `base_classes`: the library's own classes mapped to the interfaces they
  implement. An app that extends `GenericFormDataValidator<T>` implements `IFormDataValidator`
  without naming it, and counting only direct base lists undercounted that interface sixfold. When
  adding a signal here, check it against the registration count — an interface registered in DI far
  more often than it is implemented means the reader is missing a shape.
