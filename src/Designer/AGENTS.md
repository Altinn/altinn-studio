# AGENTS.md — Altinn Studio Designer (`src/Designer`)

Altinn Studio Designer is the core product: a React + .NET web app where users build applications for
Norwegian government services — dynamic forms, data models, access policies, and BPMN processes — and
deploy them. Repositories are stored in a self-hosted Gitea ("Repositories").

See the root [`/AGENTS.md`](../../AGENTS.md) for how this fits into Altinn 3. Product docs:
https://docs.altinn.studio/

## Two halves

| Folder     | What it is                                                                                                                                                                                                                                                                                                 | Stack                                                                                         | Docs                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `backend`  | ASP.NET Core Web API. Three projects: `src/Designer` (the API — Controllers/Services/Repository/Hubs/Migrations), `src/DataModeling` (JSON Schema ↔ XSD ↔ C#), `PolicyAdmin` (XACML policy).                                                                                                               | .NET (ASP.NET Core), EF Core + Postgres, SignalR, MediatR, Kafka, Redis, Quartz, LibGit2Sharp | [backend/AGENTS.md](backend/AGENTS.md)   |
| `frontend` | React/TS SPA. Multiple packages: feature apps (`app-development`, `dashboard`, `app-preview`, `admin`, `resourceadm`), editors under `packages/` (`ux-editor`, `schema-editor`, `process-editor`, `policy-editor`, `text-editor`), and shared libs under `libs/` (`studio-components`, `studio-hooks`, …). | Yarn, Vite, TypeScript, React, Tanstack Query, Jest + Playwright, Designsystemet              | [frontend/AGENTS.md](frontend/AGENTS.md) |

Supporting dirs: `development/` (local setup: `setup.js`, Gitea provisioning, mock services — Kafka, DB,
`fake-ansattporten`, `azure-devops-mock`), `testdata/` (fixtures for backend/data-modeling tests), and
`compose.yaml` (the local dev stack).

## Running Designer locally

From the repo root the fastest path is `yarn && yarn setup`, which generates the root `.env` (Gitea
users, OAuth client id/secret) and prepares the stack. Then, from `src/Designer`:

```bash
docker compose up -d --build            # full stack → http://studio.localhost
docker compose up -d --build <service>  # rebuild one service (e.g. studio_designer)
```

Log in as `localgiteaadmin`; the generated password is in the root `.env` (`GITEA_ADMIN_PASS`). To
develop a part without rebuilding its container, set the matching `DEVELOP_*` variable in `.env` (the
load balancer then routes to your local dev server) and rebuild `studio_loadbalancer`. See the root
[`README.md`](../../README.md) for the full list.

## Build, run & test (per half)

- **Backend** (`src/Designer/backend`): `dotnet build`, `dotnet run --project src/Designer` (or
  `dotnet watch`), `dotnet test`. Details + testing guidelines in [backend/AGENTS.md](backend/AGENTS.md).
- **Frontend** (`src/Designer/frontend`): `yarn build`, `yarn test` (Jest), `yarn lint`, `yarn typecheck`,
  and `yarn start-<package>` dev servers (`start-app-development`, `start-dashboard`, …). Details +
  API/query and testing patterns in [frontend/AGENTS.md](frontend/AGENTS.md).

## Coding conventions

- Avoid hard-coded numbers and strings; use meaningful, descriptive names (no abbreviations).
- Short functions that do one thing; comments only for what the code cannot express.
