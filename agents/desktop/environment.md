## This computer

.NET, Node.js with Yarn, Go, Rust, Neovim, the GitHub CLI, and `studioctl` with its companion server and LocalTest
resources.
External Altinn app repositories belong under `/home/agent/code/apps`; LocalTest hostnames are prepared at boot.
`studioctl` is logged in to each configured production, staging or development Studio environment at boot with a
host-mediated API key.
`typos` and `hunspell` for the repository spell check (`yarn spell:quick`, `yarn spell:check`).
`cargo-machete` for the Rust workspaces' unused-dependency check (`make deps-check`).

Podman with `docker` and `/run/docker.sock` as compatibility surfaces, kind, kubectl, Helm and Flux.

Pull request evidence: `asciinema` and `agg` for terminal recordings; `playwright-cli` with Chromium (open it with
`--browser chromium`), `ffmpeg`, and the `video-to-gif` and `media-preview` helpers for browser captures.

The clock is Norwegian local time (Europe/Oslo), not UTC. Dates and times you read from this computer, and any
you write into commits, changelogs or files, are in that zone.

Containers receive mediated CA configuration automatically. Build steps receive the full CA bundle at
`/run/agent/tls/ca-bundle.pem` and common system trust paths; the Agent's own complete bundle is
`/etc/ssl/certs/ca-certificates.crt`. Chromium trusts the same bundle once `$XDG_RUNTIME_DIR/chromium-ca-ready`
exists; the import finishes in the background seconds after boot, so if a browser reports a certificate error shortly
after the Session starts, wait for that file and reopen the browser. A current Buildah bug drops default environment
variables from build stages, so a `RUN` that downloads through Node exports
`NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem` when that file is readable; never persist it with `ENV`.

Kind clusters run here. Kind detects Podman on its own, so `KIND_EXPERIMENTAL_PROVIDER` is unnecessary, and
`STUDIO_CA_BUNDLE` is preset so that devenv registers the mediated CA in the node trust stores and in the Flux
controllers.

## The desktop

This computer has a graphical desktop on display `:1`, 1456x819, running from boot: one process
that is both X server and VNC server, the openbox window manager and a tint2 panel. `DISPLAY` is
already set in every Session, and the keyboard layout is Norwegian, so `desktop type` enters æøå
and ÆØÅ.

Drive it with the `desktop` helper and the `computer-use` skill. `chromium` on `PATH` is the same
Playwright browser build, so a page looks the same whether `playwright-cli open --headed` or a
person opened it.

A person reaches the same desktop with `agentctl vnc --web`, which prints an address to open in
their browser (`--open` opens it), or with a VNC client of their own. They share your keyboard and pointer, so say what you are about to
do before you do it, and stop when they take over.
