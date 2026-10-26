## This computer

.NET, Node.js with Yarn, Go, Neovim, the GitHub CLI, and `studioctl` with its companion server and LocalTest resources.
The .NET SDKs 8, 10 and 11 sit side by side, so each project's `global.json` selects its own; `uv` runs the Python
projects under `src/AI` and installs the Python release their `.python-version` names.
External Altinn app repositories belong under `/home/agent/code/apps`.
`studioctl` is logged in to each configured production, staging or development Studio environment at boot with a
host-mediated API key.
`typos` and `hunspell` for the repository spell check (`yarn spell:quick`, `yarn spell:check`).
`ilspycmd` decompiles .NET assemblies, such as NuGet package dependencies; `dotnet-trace`, `dotnet-counters` and
`dotnet-dump` diagnose running .NET processes, and `dotnet-ef` runs the Designer's Entity Framework migrations.
`golangci-lint` for the Go modules and `typst`, which renders the augmenter-agent's PDFs.
`shellcheck` and `actionlint` for shell scripts and workflows; `make`, `file`, `unzip`, `zip` and `wget`.

No container, Kubernetes or browser tooling: `studioctl` can support authentication, repository and app work, but
LocalTest and browser verification cannot run here, so say so instead of working around it.

Pull request evidence: `asciinema` and `agg` for terminal recordings. Browser screenshots and clips are not possible on
this computer.

The clock is Norwegian local time (Europe/Oslo), not UTC. Dates and times you read from this computer, and any
you write into commits, changelogs or files, are in that zone.
