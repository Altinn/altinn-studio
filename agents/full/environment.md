## This computer

.NET, Node.js with Yarn, Go, Rust, the GitHub CLI, Podman with `docker` and `/run/docker.sock` as compatibility
surfaces, kind, kubectl, Helm and Flux.

Pull request evidence: `asciinema` and `agg` for terminal recordings; `playwright-cli` with Chromium (open it with
`--browser chromium`), `ffmpeg`, and the `video-to-gif` and `media-preview` helpers for browser captures.

Containers receive mediated CA configuration automatically. Build steps receive the full CA bundle at
`/run/agent/tls/ca-bundle.pem` and common system trust paths. A current Buildah bug drops default environment variables
from build stages, so tools that ignore the system store need a step-scoped variable such as
`RUN NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem npm ci` or `RUN NODE_OPTIONS=--use-openssl-ca npm ci`. Kind's
`KIND_EXPERIMENTAL_PROVIDER=podman` mode is installed but unverified; do not assume nested kind containers inherit the
Agent's mediated CA trust.
