# Altinn Agents

These manifests provide two Altinn Studio development environments:

| Variant | Image | Additional tools |
| --- | --- | --- |
| `minimal` | `ghcr.io/altinn/altinn-studio/agent-minimal:latest` | .NET, Node.js and Go |
| `full` | `ghcr.io/altinn/altinn-studio/agent-full:latest` | Rust, Podman, kind, kubectl, Helm and Flux |

Both include Claude Code and Codex, and both make one non-destructive Altinn Studio clone attempt during systemd
startup. Copy the selected variant's `.env.sample` to `.env`, provide `GITHUB_TOKEN`, then apply its `agent.yaml`.

The image workflow publishes multi-platform `linux/amd64` and `linux/arm64` images. Main publishes `latest` and an
immutable `sha-<commit>` tag. Pull requests from this repository publish `pr-<number>` and
`pr-<number>-<commit>` tags; fork pull requests build without publishing.
