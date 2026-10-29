# Contributing

This is how we work on Altinn Studio itself. To build apps with Altinn Studio, read
[docs.altinn.studio](https://docs.altinn.studio) instead.

## Issues

Report a bug, request a feature or ask a question by [opening an issue](https://github.com/Altinn/altinn-studio/issues/new/choose)
with the template that fits. The team plans its work with the user story, chore, analysis and epic templates.

Labels say which part of Studio an issue is about (`area/*`) and which squad owns it (`squad/*`).

## Development

- Start with the README of the component you change. The [root README](README.md) says how the parts fit
  together.
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
  `feat(designer): ...` or `fix(studioctl): ...`.
- Write the description for the reviewer, as the [pull request template](.github/pull_request_template.md) asks.
  When the pull request changes after review, rewrite the description to describe it as it is now, and say what
  changed in a comment.
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

Stack dependent pull requests with GitHub's native stacks, through the [`gh stack`](https://github.com/github/gh-stack)
extension. `gh stack sync` rebases each branch on its updated parent and pushes the stack.

## License

Altinn Studio is licensed under the [MIT License](LICENSE), and so are the contributions you make to it.
