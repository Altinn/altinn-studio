# AGENTS.md — Fetch all apps (`src/tools/altinn-fetch-apps`)

A Bash script that clones every Altinn 3 app running in tt02 and prod, and checks out the commit of the
version deployed in each environment. The result is a folder of app repositories to search across. It
can also be used as `ALTINN_ALL_APPS_DIR` for the all-apps tests in
[`src/App/frontend`](../../App/frontend/AGENTS.md).

One of the standalone [tools](../AGENTS.md). Full docs: [`README.md`](README.md).

## Usage

`./fetch.sh <target-folder> [environments]` — the folder must exist. Environments are comma-separated
(default `tt02,prod`, or `FETCH_ENVIRONMENTS`). Requires `bash`, `curl`, `jq` and `git`.

## Working here

- A full run clones every deployed app and takes a long time; do not run it in agent sessions.
- Keep the script portable between macOS and Linux.
