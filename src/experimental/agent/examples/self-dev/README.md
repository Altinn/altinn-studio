# Agent platform self-development Agent

Agents for working on the agent platform itself, the crates under `src/experimental`.

| Variant    | Checkout                                                  |
| ---------- | --------------------------------------------------------- |
| `worktree` | The current host checkout bind-mounted read-write         |
| `checkout` | A fresh clone of `Altinn/altinn-studio` made once at boot |
| `nested`   | Like `checkout`, sized to run inside another Agent        |

```sh
make -C src/experimental user-install
agentctl claude login
cd src/experimental/agent/examples/self-dev/checkout
cp .env.sample .env                     # GitHub PAT
agentctl apply -f agent.yaml
agentctl attach session/s1
```

The worktree variant mounts the whole checkout, so its secret file must live outside it:

```sh
agentctl apply -f worktree/agent.yaml --env-file ~/.agent/self-dev.env
```

Inside a running Agent, `instructions.md` tells the harness how to build, test and run the platform nested, and the
`pr-evidence` skill how to record `agentctl` demonstrations and attach them to pull requests.
