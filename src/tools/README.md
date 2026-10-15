# Tools

This directory holds standalone tools that the Studio team uses for releases, deployments and operations. Each tool
has its own toolchain. The developer CLI, [studioctl](../cli/README.md), lives in `src/cli`.

- [`altinn-fetch-apps`](altinn-fetch-apps/README.md) clones every Altinn 3 app that runs in tt02 or production, at
  its deployed version.
- [`altinn-fleet-stats`](altinn-fleet-stats/README.md) is a dashboard with statistics about the Altinn 3 apps in tt02
  and production.
- [`deployer`](deployer/README.md) is a local dashboard for following and approving deployments across environments.
- [`health`](health/README.md) checks and changes resources across many Kubernetes clusters at once.
- [`releaser`](releaser/README.md) releases components of this repository. It manages changelogs, version tags, builds
  and GitHub releases.
