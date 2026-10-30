# GitHub Actions

[Workflows](workflows) define the repository's checks, builds, releases, and deployments.
Shared steps live in [composite actions](actions). Start a new workflow from an existing one for the same kind of
task, and reuse its actions and templates.

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

## Image build contexts

An image's build context holds only what the image needs.

- Images build from `src/`, or from their own directory when they use no shared code. Only images that need the
  repository root, such as Designer, build from there.
- Each image built from `src/` or the root has a `<Dockerfile>.dockerignore` whose first line is
  `# Build context: src/` or `# Build context: repository root`. It excludes `**`, then re-includes explicit paths.
  Podman matches `**/` re-includes differently, and re-including a parent directory sends all of it.
- The `.dockerignore` of `src/` and of the root allows what any of their images needs, for Compose and plain
  `podman build`, which use it instead of an image's own. Regenerate both with `check-image-contexts.sh --write`.

[check-image-contexts.sh](scripts/check-image-contexts.sh) checks this in CI, for each allowlist with that first line.

## Workflow names

- `deploy-<target>-<name>.yaml` deploys a service or resource when a change to it reaches `main`. The target is the
  kind of cluster it belongs to: `runtime`, `studio` or `admin` (adminservices). Older Studio deployments, such as
  `deploy-designer.yaml`, have no target in the name.
- `release-<product>.yaml` publishes a release of a product.
- `template-*.yaml` are reusable workflows that other workflows call.
- Other workflows are named after the area and component they check, such as `runtime-pdf3-build.yml`.
- New workflows use the `.yaml` extension. `studio-components-deploy.yaml`, `apps-storybook-deploy.yaml` and the
  `.yml` files are older than these names.
