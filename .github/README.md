# GitHub Actions

[Workflows](workflows) define the repository's checks, builds, releases, and deployments.
Shared steps live in [composite actions](actions).

Use the component's Makefile targets or package scripts for builds and tests so developers can run the same
checks locally. The [operator checks](workflows/runtime-operator-build.yml) show this approach.

Use `self-hosted-ubuntu` for builds and tests that benefit from the
[runner image's installed tools](../src/ci/github-runner/Dockerfile) and caches.
Use `ubuntu-latest` for short checks that do not need them.

Reuse deployment templates for environment selection and artifact publishing.
The [Designer deployment](workflows/deploy-designer.yaml) shows how to combine them.
See [Environments](../docs/infrastructure/environments.md) for deployment targets and configuration sources.

[Cache warming](workflows/cache-warm.yml) populates shared dependency caches from `main` so pull requests can
reuse them. Entries saved under one pull request cannot serve other pull requests and can evict shared entries.

## Workflow names

- `deploy-<target>-<name>.yaml` deploys a service or resource when a change to it reaches `main`. The target is
  `runtime` (runtime clusters), `studio` (Studio clusters), `admin` (adminservices) or `dis` (DIS Core). Older
  Studio deployments, such as `deploy-designer.yaml`, have no target in the name.
- `release-<product>.yaml` publishes a release of a product.
- `template-*.yaml` are reusable workflows that other workflows call.
- Other workflows are named after the area and component they check, such as `runtime-pdf3-build.yml`.
