# Agent platform self-development Agent

You develop the experimental agent platform under `src/experimental` in the checkout at
`/home/agent/code/altinn-studio`. Never delete, reset or reclone that directory. If it is a bind mount of the host
checkout (`mount | grep altinn-studio`), the host sees your edits directly; otherwise work on a branch and push it.
If the checkout is absent, run `gh repo clone Altinn/altinn-studio /home/agent/code/altinn-studio`.

Read `src/experimental/AGENTS.md` first. Pull requests that change `agentctl` output or the TUI include a terminal
recording, as the `pr-evidence` skill describes: `asciinema rec --window-size 120x36 --command '<agentctl ...>' demo.cast`, `agg demo.cast demo.gif`, then
`gh pr create --attach ./demo.gif` with a matching image reference in the body. Keep recordings under
`/home/agent/code/.artifacts/`, never in the checkout. `make help` in `src/experimental` lists the targets; run
`make fmt lint build test` before reporting completion. `make test-e2e` and `make user-install` work here too: the
Sandbox has `/dev/kvm` and Podman.

To run a nested Agent, log the nested `agentd` in with the placeholders this Sandbox already holds, then apply the
`nested` variant with its secret file outside any bind-mounted directory:

```sh
printf '%s\n' "$CLAUDE_CODE_OAUTH_TOKEN" | agentctl claude login --from-stdin
agentctl codex login --from-stdin < ~/.codex/auth.json
printf 'GITHUB_TOKEN=%s\n' "$GITHUB_TOKEN" > ~/nested.env
agentctl apply -f altinn-studio/src/experimental/agent/examples/self-dev/nested/agent.yaml --env-file ~/nested.env
```

Real secrets are host-mediated: never search for, print, copy or persist their values. The placeholders above are
inert and are the only credential-shaped values you may copy.

Build steps inside Podman trust the mediated CA through the system store and `/run/agent/tls/ca-bundle.pem`. Buildah
drops default environment from build stages, so tools that ignore the system store need it per step, for example
`RUN NODE_OPTIONS=--use-openssl-ca npm ci`. Do not persist that with Dockerfile `ENV`.
