## This computer

.NET, Node.js with Yarn, Go, Neovim, the GitHub CLI, and `studioctl` with its companion server and LocalTest resources.
External Altinn app repositories belong under `/home/agent/code/apps`.
`typos` and `hunspell` for the repository spell check (`yarn spell:quick`, `yarn spell:check`).
`ilspycmd` decompiles .NET assemblies, such as NuGet package dependencies; `dotnet-trace`, `dotnet-counters` and
`dotnet-dump` diagnose running .NET processes, and `dotnet-ef` runs the Designer's Entity Framework migrations.
`golangci-lint` for the Go modules and `typst`, which renders the augmenter-agent's PDFs.
`shellcheck` and `actionlint` for shell scripts and workflows; `make`, `file`, `unzip`, `zip` and `wget`.

No container, Kubernetes or browser tooling: `studioctl` can support authentication, repository and app work, but
LocalTest and browser verification cannot run here, so say so instead of working around it.

Pull request evidence: `asciinema` and `agg` for terminal recordings. Browser screenshots and clips are not possible on
this computer.
