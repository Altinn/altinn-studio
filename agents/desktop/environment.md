## This computer

.NET, Node.js with Yarn, Go, Rust, Neovim, the GitHub CLI, and `studioctl` with its companion server and LocalTest
resources.
External Altinn app repositories belong under `/home/agent/code/apps`; LocalTest hostnames are prepared at boot.

Podman with `docker` and `/run/docker.sock` as compatibility surfaces, kind, kubectl, Helm and Flux.

Pull request evidence: `asciinema` and `agg` for terminal recordings; `playwright-cli` with Chromium (open it with
`--browser chromium`), `ffmpeg`, and the `video-to-gif` and `media-preview` helpers for browser captures.

The clock is Norwegian local time (Europe/Oslo), not UTC. Dates and times you read from this computer, and any
you write into commits, changelogs or files, are in that zone.

Containers receive mediated CA configuration automatically. Build steps receive the full CA bundle at
`/run/agent/tls/ca-bundle.pem` and common system trust paths; the Agent's own complete bundle is
`/etc/ssl/certs/ca-certificates.crt`, and Chromium trusts the same bundle. A current Buildah bug drops default
environment variables from build stages, so a `RUN` that downloads through Node exports
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

A person reaches the same desktop over VNC on loopback port 5900, forwarded with
`agentctl port-forward` or an SSH tunnel; they share your keyboard and pointer.
