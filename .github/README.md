# GitHub Actions

[Workflows](workflows) define the repository's checks, builds, releases, and deployments.
Shared steps live in [composite actions](actions). Follow these conventions when changing a workflow.

## Reuse build commands and deployment templates

Call the component's Makefile targets or package scripts for builds and tests so developers can run the same
checks locally. The [operator checks](workflows/runtime-operator-build.yml) use this approach.

Reuse the deployment templates for environment selection and artifact publishing.
The [Designer deployment](workflows/deploy-designer.yaml) shows how to combine them.
See [Environments](../docs/infrastructure/environments.md) for deployment targets and configuration sources.

## Triggers and path filters

Build, test, and analysis jobs skip draft pull requests and run when a pull request becomes ready for review.
Include `ready_for_review` in the trigger and guard each job against drafts and closed pull requests.
The [gateway tests](workflows/runtime-gateway-tests.yaml) show this pattern. Metadata and title checks can run on drafts.

Scope path filters to the inputs a workflow uses, including the workflow itself. On both pull requests and
pushes, exclude `AGENTS.md`, README files, `CONTRIBUTING.md`, `CHANGELOG.md`, and `docs/` directories from code checks.
Documentation, spelling, and release workflows still include the documents they check or publish.

Keep Markdown files that a build or test uses in its path filters. For example, changes to a skill shipped with
the CLI must trigger the CLI build. If a documentation exclusion matches such a file, add an include pattern
after it. Explain in a comment which build or test needs the file.

For check workflows, group concurrent runs by workflow and pull request or ref, with a run ID fallback.
Cancel superseded checks.

## Runners and permissions

Use `ubuntu-latest` for short checks and `self-hosted-ubuntu` when the
[runner image's tools](../src/ci/github-runner/Dockerfile) or caches help.
Fork pull requests can use the same runners. Choose a separate path when a job needs secrets that forks cannot access.
Set `timeout-minutes` on each job based on its expected duration.

- Pin third-party actions to a full commit SHA with a version comment. Renovate updates the pins.
- Declare the narrowest permissions the job needs. Use `contents: read` by default, and do not give
  pull request jobs write access to shared infrastructure.
- Set checkout's `persist-credentials: false` unless the job pushes, and use `fetch-depth: 1` unless it needs history.

## Caches

[Cache warming](workflows/cache-warm.yml) populates shared dependency caches from `main`.
Pull request jobs normally restore them without saving. Entries saved under one pull request cannot serve other
pull requests and can cause shared entries to be evicted.

Reuse the existing cache setup, such as [setup-go-cached](actions/setup-go-cached/action.yaml) for Go.
Keep cache-warming jobs in sync with the workflows that use their caches.

Only trusted jobs on `main` write shared container image caches.
