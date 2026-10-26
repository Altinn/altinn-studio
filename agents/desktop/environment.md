## This computer

.NET, Node.js with Yarn, Go, Rust, Neovim, the GitHub CLI, and `studioctl` with its companion server and LocalTest
resources.
The .NET SDKs 8, 10 and 11 sit side by side, so each project's `global.json` selects its own; `uv` runs the Python
projects under `src/AI` and installs the Python release their `.python-version` names.
External Altinn app repositories belong under `/home/agent/code/apps`; LocalTest hostnames are prepared at boot.
`studioctl` is logged in to each configured production, staging or development Studio environment at boot with a
host-mediated API key.
`typos` and `hunspell` for the repository spell check (`yarn spell:quick`, `yarn spell:check`).
`cargo-machete` for the Rust workspaces' unused-dependency check (`make deps-check`) and `cargo-deny` for the
root `deny.toml`.
Python 3 with `venv` and `pip`; create a virtual environment per project, as the system interpreter is externally
managed.
`golangci-lint` for the Go modules, `typst`, which renders the augmenter-agent's PDFs, and `hurl` for the gitea-proxy
tests (Ubuntu's 7.1, where CI uses 8.0).
`yq`, `actionlint` and `shellcheck` for manifests, workflows and shell scripts. `psql`, `unzip`, `zip`, `rsync` and
`file`.
`dotnet-ef` for the Designer's Entity Framework migrations.
Debugging and profiling: `dotnet-trace`, `dotnet-counters` and `dotnet-dump` alongside `perf`, `lldb` and `strace`;
`ilspycmd` to decompile .NET assemblies; `hyperfine` for benchmarks; `lsof`, `tcpdump`, `socat`, `nc` and `dig`.

Podman, with the `docker` command and Docker Compose on `/run/docker.sock`, kind, kubectl, Helm and Flux.
`agentctl` and `agentd` for nested Agents, where the Agent sandbox section says they can run; the `agentctl` skill
describes them.

Pull request evidence: `asciinema` and `agg` for terminal recordings; `playwright-cli` with Chromium (open it with
`--browser chromium`), `ffmpeg`, and the `video-to-gif` and `media-preview` helpers for browser captures.

App frontend's Cypress tests run in the same Chromium: `CHROME_PATH` names it, and Cypress finds it only by path, so
pass `--browser "$CHROME_PATH"`. Yarn does not run the Cypress postinstall, so run `yarn cypress install` once per
Cypress version first. `k6` runs App frontend's `yarn k6:browser:*` scripts.

The clock is Norwegian local time (Europe/Oslo), not UTC. Dates and times you read from this computer, and any
you write into commits, changelogs or files, are in that zone.

Containers receive mediated CA configuration automatically. Build steps receive the full CA bundle at
`/run/agent/tls/ca-bundle.pem` and common system trust paths; the Agent's own complete bundle is
`/etc/ssl/certs/ca-certificates.crt`. Chromium trusts the same bundle once `$XDG_RUNTIME_DIR/chromium-ca-ready`
exists; the import finishes in the background seconds after boot, so if a browser reports a certificate error shortly
after the Session starts, wait for that file and reopen the browser. A current Buildah bug drops default environment
variables from build stages, so a `RUN` that downloads through Node exports
`NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem` when that file is readable, and one that downloads through uv
exports `SSL_CERT_FILE` with the same path; never persist either with `ENV`.

Podman ignores a Dockerfile's own `<Dockerfile>.dockerignore` when the build context has a `.dockerignore`, where
Docker prefers it. Pass it with `--ignorefile`, for example
`docker build -f src/AI/assistant/dockerfile --ignorefile src/AI/assistant/dockerfile.dockerignore .`. Compose has no
such option, so a compose service whose Dockerfile has its own ignore file builds with the context's instead.

Kind clusters run here. Kind detects Podman on its own, so `KIND_EXPERIMENTAL_PROVIDER` is unnecessary, and
`STUDIO_CA_BUNDLE` is preset so that devenv registers the mediated CA in the node trust stores and in the Flux
controllers.
