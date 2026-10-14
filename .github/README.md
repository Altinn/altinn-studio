# GitHub Actions

[Workflows](workflows) define the repository's checks, builds, releases, and deployments.
Shared steps live in [composite actions](actions).

Use the component's Makefile targets or package scripts for builds and tests so developers can run the same
checks locally. The [operator checks](workflows/runtime-operator-build.yml) show this approach.

Reuse deployment templates for environment selection and artifact publishing.
The [Designer deployment](workflows/deploy-designer.yaml) shows how to combine them.
See [Environments](../docs/infrastructure/environments.md) for deployment targets and configuration sources.

[Cache warming](workflows/cache-warm.yml) populates shared dependency caches from `main` so pull requests can
reuse them. Entries saved under one pull request cannot serve other pull requests and can evict shared entries.
