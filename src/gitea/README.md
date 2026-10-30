# Gitea

The image for Studio's Git server, with our configuration, templates and locales. Designer reaches it through the
[gitea-proxy](../gitea-proxy), and [deploy-repositories.yaml](../../.github/workflows/deploy-repositories.yaml) builds
and deploys both. Locally, run `docker compose up -d --build studio_repositories` in `src/Designer` to apply a change.

## Git hooks

Repositories must not contain symbolic links, since the tools that check them out, such as app builds, would follow
them out of the repository. [app.ini](files/conf/app.ini) points git's `core.hooksPath` at `/etc/gitea/git-hooks`,
where the [Dockerfile](Dockerfile) installs [the hook script](files/git-hooks/hook) under each hook name that Gitea
uses, so it runs for every repository, including ones created later. As `pre-receive`, it rejects a push that adds or
changes a symbolic link in any commit, or that pushes a tag pointing at a tree holding one. Symbolic links that a
repository already holds can stay until someone changes them. For every hook, it then runs the repository's own hook,
which Gitea generates and needs for its push handling.

The hook only sees pushes, which include Gitea's own changes such as edits in the web editor, merges and repositories
generated from a template. Migrations and pull mirrors fetch without running receive hooks, so they can still bring in
symbolic links.

## Upgrading Gitea

The [upgrade routine](https://github.com/Altinn/altinnpedia/blob/main/content/altinn-3/ops/patching/containers/_index.md#gitea)
is in Norwegian. In short:

- Do not upgrade to an `x.y.0` release. Wait until the version is stable.
- Our configuration, templates and locales can break between releases. Compare
  [app.ini](files/conf/app.ini) with Gitea's `custom/conf/app.example.ini`, and [templates](files/custom/templates)
  with Gitea's `templates`, at the version you upgrade to.
- Check that the [Dockerfile](Dockerfile) installs the hook script under every hook name that Gitea generates in a
  repository's `hooks` folder. Gitea's push handling breaks for a hook missing from `/etc/gitea/git-hooks`.
- [files/locale/base](files/locale/base) holds Gitea's Norwegian translation. Update it from
  [Crowdin](https://crowdin.com/project/gitea/no) when you upgrade, checking that the keys match the new version, since
  Crowdin only has the latest. The [Dockerfile](Dockerfile) takes the English locale from the Gitea image.
- Do not edit the base translation, since the next upgrade overwrites it. Submit a change to Crowdin, or add it to
  our own locales in [files/locale/custom](files/locale/custom). Check that their keys are still in use.
