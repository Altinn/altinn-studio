# Tools

Standalone tools that the Studio team runs for releases, deployments and operations. They are not part of the
products, and each has its own toolchain. The developer CLI, [studioctl](../cli/README.md), lives in `src/cli`.

- [`altinn-fetch-apps`](altinn-fetch-apps/README.md) clones every Altinn 3 app that runs in tt02 or production, at its
  deployed version, so you can search across them.
- [`altinn-fleet-stats`](altinn-fleet-stats/README.md) is a dashboard with statistics about the apps in tt02 and
  production, for the UX team.
- [`deployer`](deployer/README.md) is a local dashboard for following and approving deployments across environments.
- [`health`](health/README.md) checks and runs commands on many Kubernetes clusters at once.
- [`releaser`](releaser/README.md) releases the components that publish versioned releases, and checks changelogs in
  CI.
