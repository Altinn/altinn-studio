# GitHub Actions

[Workflows](workflows) define the repository's checks, builds, releases, and deployments.
Shared steps live in [composite actions](actions). Follow these conventions when changing a workflow.

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

Formatting checks are optional for Markdown documentation. Compiled `.mdx` files follow the code formatting rules.

Group concurrent runs by workflow and pull request or ref, with a run ID fallback.
Cancel superseded checks, but allow deployments and publishing to finish.

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
Pull request jobs restore them. Entries saved under one pull request cannot serve other pull requests and can
cause shared entries to be evicted. Caches that pass build outputs between jobs in the same run and
`setup-node`'s Yarn cache are exceptions.

Use [setup-go-cached](actions/setup-go-cached/action.yaml) for Go dependencies. When adding a Go module or
changing its runner, update the cache-warming matrix to cover the same module and runner combination.
Keep Yarn and Rust cache settings consistent with the cache-warming jobs.

Container builds use registry caches. Only trusted jobs on `main` write shared image caches.
The LocalTest image cache references also have consumers in the CLI's
[core](../src/cli/internal/cmd/env/localtest/components/core.go) and
[PDF](../src/cli/internal/cmd/env/localtest/components/pdf.go) components. Update those together when renaming a cache.

Use fallback restore keys for dependency caches, but require exact matches for caches keyed by their contents.
Put tools that every run needs in the [runner image](../src/ci/github-runner/Dockerfile).

## Check failures

Before investigating missing checks, check whether the pull request has merge conflicts.
GitHub cannot run `pull_request` workflows against a merge commit it cannot create.

A check watcher can finish before all expected workflows have registered. Confirm that the expected runs exist
and inspect their conclusions before reporting success. For a failed matrix, find the job that failed first.
Other jobs may have been canceled by fail-fast.

The [App Frontend Cypress workflow](workflows/app-frontend-cypress.yml) passes cached prerequisites between jobs.
If retrying failed jobs reports a missing prerequisite cache, rerun the whole workflow.
