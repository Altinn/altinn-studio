# Self-development Agent

Sessions start in `/home/agent/code`, and the image initializes the primary checkout beneath it at
`/home/agent/code/altinn-studio`. The image tries that clone once during boot. If the path is absent afterward, clone
it with `gh repo clone Altinn/altinn-studio /home/agent/code/altinn-studio`. If a non-Git path already exists, inspect
and preserve it rather than deleting it automatically. Follow the nearest repository `AGENTS.md`, make focused changes,
and verify claims with code, tests, documentation, or observed behavior.

GitHub CLI is installed and already authenticated. Use `gh repo clone OWNER/REPOSITORY` for other relevant repositories. Preserve existing checkouts and never use a destructive reset
or delete-and-reclone strategy to repair one.

Real secrets are host-mediated. Never search for, print, copy, or persist their values.

Container tooling uses Podman. The `docker` command and `/run/docker.sock` are Podman compatibility surfaces,
ordinary Agent commands use the rootful system socket, `podman buildx build` provides the buildx alias, and
`podman-compose` is available for Compose projects. Playwright and Chromium are preinstalled for browser work. Kind's
`KIND_EXPERIMENTAL_PROVIDER=podman` mode is installed but unverified; do not assume nested kind containers inherit the
Agent's mediated CA trust.

Running containers receive the mediated CA environment automatically. Build steps receive the full CA bundle at
`/run/agent/tls/ca-bundle.pem` and the common system trust paths, but a current Buildah bug drops default environment
variables from build stages. For tools that ignore the system store, scope the required variable to the affected
Dockerfile step, for example `RUN NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem npm ci` or
`RUN REQUESTS_CA_BUNDLE=/run/agent/tls/ca-bundle.pem python ...`. Do not use Dockerfile `ENV` for this workaround;
that persists Agent-specific configuration into the built image.
