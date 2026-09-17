# Agent platform self-development Agent

This Agent develops the Agent platform itself, under `src/experimental`.

| Variant | Checkout | Resources |
| --- | --- | --- |
| default (`agent.yaml`) | Fresh `Altinn/altinn-studio` clone made at boot | Normal |
| `nested` | Fresh clone | Reduced to fit inside the default Agent |
| `worktree` | Current host checkout mounted read-write | Normal |

Every variant builds the directory's `Dockerfile` locally. Self-development images are not published to GHCR.

```sh
make -C src/experimental user-install
agentctl claude login
cd src/experimental/agent/examples/self-dev
mkdir -p ~/.agent
cp .env.sample ~/.agent/self-dev.env
agentctl apply --env-file ~/.agent/self-dev.env --wait
agentctl attach session/s1
```

Select the reduced nested variant from the same directory:

```sh
agentctl apply --variant nested --env-file ~/.agent/self-dev.env --wait
agentctl create session/s1 --variant nested --harness codex
```

The worktree variant mounts the whole checkout, so its environment file must live outside it. Include
`GIT_USER_NAME`, `GIT_USER_EMAIL`, and `GITHUB_TOKEN` using `.env.sample` as a template:

```sh
agentctl apply --variant worktree --env-file ~/.agent/self-dev.env
```

Developers may create an ignored local variant such as `agent.mine.yaml`. It can extend another sibling variant,
but credentials still belong in an external environment file because ignored files remain visible through a bind
mount.

Inside a running Agent, `instructions.md` tells the harness how to build, test and run the platform nested, and the
`pr-evidence` skill how to record `agentctl` demonstrations and attach them to pull requests.
