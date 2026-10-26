# Contributing

This is how we work on Altinn Studio itself. To build apps with Altinn Studio, read
[docs.altinn.studio](https://docs.altinn.studio) instead.

## Issues

Report a bug, request a feature or ask a question by [opening an issue](https://github.com/Altinn/altinn-studio/issues/new/choose)
with the template that fits. The team plans its work with the user story, chore, analysis and epic templates.

Each template sets the issue type and a `kind/*` label, and a new issue starts as `status/triage` or `status/draft`.
Labels also say which part of Studio an issue is about (`area/*`), which squad owns it (`squad/*`) and which service
owners need it (`org/*`).

## Development

- Start with the README of the component you change. The [root README](README.md) maps the repository.
- Follow the [coding standards](docs/coding-standards.md) and the [documentation rules](docs/documentation.md).
  Workflows, builds and deployments follow the conventions in [.github/README.md](.github/README.md).
- Before you push, run the checks of the component you changed with its Makefile or package scripts, which run the
  same checks as CI. Also run `yarn spell:quick`, and `yarn docs:validate` when you changed docs.
- Update the docs your change affects in the same pull request. When service owners or app developers will notice the
  change, update [docs.altinn.studio](https://github.com/Altinn/altinn-studio-docs) too.

## Pull requests

- Branch from `main`, or from a fork if you are not on the team.
- Keep each pull request focused on one change. Stack dependent pull requests when parts need their own review or
  rollout.
- Titles follow [Conventional Commits](https://www.conventionalcommits.org), usually with the area as scope, such as
  `feat(designer): ...` or `fix(studioctl): ...`. [Lint PR](.github/workflows/lint-pr.yaml) checks the title.
- Write the description for the reviewer, as the [pull request template](.github/pull_request_template.md) asks.
  When the pull request changes after review, rewrite the description to describe it as it is now, and say what
  changed in a comment.
- [CODEOWNERS](.github/CODEOWNERS) decides which team reviews which paths. It is generated, so change
  [its generator](.github/scripts/codeowners-generate.mjs) and run `yarn codeowners:generate`.
- When someone on the team adds the `approve` label, [a workflow](.github/workflows/approve-pr.yaml) approves the
  pull request. Use it for small or already agreed changes.
- Pull requests are squash-merged, except [upstream syncs](src/App/docs/upstream-sync.md), which need a merge commit.
- List commits that only reformat code in [.git-blame-ignore-revs](.git-blame-ignore-revs), and run
  `git config blame.ignoreRevsFile .git-blame-ignore-revs` so that `git blame` skips them.

### Changelogs

The components with a `CHANGELOG.md`, such as [studioctl](src/cli/CHANGELOG.md) and the
[app backend](src/App/backend/CHANGELOG.md), publish it as their release notes. A change their users will notice gets
an entry under `## [Unreleased]`, written for those users as the [changelog skill](agents/_skills/changelog/SKILL.md)
describes. CI requires an entry for changes to studioctl. Label a pull request `skip-changelog` when users will not
notice it.

### Releases

A release promotes the `[Unreleased]` section of a component's changelog to a version.
[Releasing](docs/releasing.md) says how.

### Stacked pull requests

Stack pull requests with GitHub's native stacks, through the [`gh stack`](https://github.com/github/gh-stack)
extension. `gh stack sync` fetches, rebases each branch on its updated parent and pushes the stack.

- If the commits of a squash-merged parent still replay into a child, drop them with
  `git rebase --onto origin/main <the parent's last commit before the merge>`. `gh pr view <parent> --json commits`
  lists them.
- GitHub computes a stacked pull request's mergeability against `main`, not its base branch. A child can show
  conflicts that only `git merge-tree --write-tree origin/main <head>` reproduces.
- A pull request's base cannot be changed while it is in a stack. Run `gh stack unstack` first.

## License

Altinn Studio is licensed under the [MIT License](LICENSE), and so are the contributions you make to it.
