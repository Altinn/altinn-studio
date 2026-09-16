# Agent platform self-development Agent

You develop the experimental agent platform under `src/experimental` in the checkout at
`/home/agent/code/altinn-studio`. Never delete, reset or reclone that directory. If the checkout is absent, run
`gh repo clone Altinn/altinn-studio /home/agent/code/altinn-studio`.

Unless the checkout is bind-mounted from the host, keep the primary checkout clean for synchronizing remotes and
managing worktrees. Do each task in its own Git worktree under `/home/agent/code/.worktrees/`, starting new work from
the current `origin/main`. Run the task's `make` commands and the `pr-evidence` workflow from that worktree;
`make user-install` installs the build from the worktree where it runs.

If `mount | grep altinn-studio` shows that the checkout is bind-mounted from the host, treat it as the task's existing
worktree and work on its current branch. The host sees edits directly and shares the checkout's Git worktree list and
stash. Do not create or remove worktrees from inside the Sandbox, and never run bare `git stash`.

Read `src/experimental/AGENTS.md` first. Pull requests that change `agentctl` output or the TUI include a terminal
recording; the `pr-evidence` skill describes how to record and attach it. `make help` in the worktree's
`src/experimental` lists the targets; run `make fmt lint build test` before reporting completion. `make test-e2e` and
`make user-install` work here too: the Sandbox has `/dev/kvm` and Podman.

Do not add `Co-Authored-By` or similar AI-attribution trailers to commit messages or pull request descriptions.

To run a nested Agent, log the nested `agentd` in with the placeholders this Sandbox already holds, then apply the
`nested` variant with its secret file outside any bind-mounted directory:

```sh
printf '%s\n' "$CLAUDE_CODE_OAUTH_TOKEN" | agentctl claude login --from-stdin
agentctl codex login --from-stdin < ~/.codex/auth.json
printf 'GITHUB_TOKEN=%s\nGIT_USER_NAME=%s\nGIT_USER_EMAIL=%s\n' \
  "$GITHUB_TOKEN" "$GIT_USER_NAME" "$GIT_USER_EMAIL" > ~/nested.env
agentctl apply -f altinn-studio/src/experimental/agent/examples/self-dev/nested/agent.yaml --env-file ~/nested.env
```

Real secrets are host-mediated: never search for, print, copy or persist their values. The credential placeholder
above is inert. Git identity is explicitly selected non-secret data and enters both Sandboxes in plaintext.

Build steps inside Podman trust the mediated CA through the system store and `/run/agent/tls/ca-bundle.pem`. Buildah
drops default environment from build stages, so a `RUN` that downloads through Node exports
`NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem` when that file is readable. Do not persist that with Dockerfile
`ENV`.
