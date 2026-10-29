# Gitea

The image for Studio's Git server, with our configuration, templates and locales. Designer reaches it through the
[gitea-proxy](../gitea-proxy), and [deploy-repositories.yaml](../../.github/workflows/deploy-repositories.yaml) builds
and deploys both. Locally, run `docker compose up -d --build studio_repositories` in `src/Designer` to apply a change.

## Upgrading Gitea

The [upgrade routine](https://github.com/Altinn/altinnpedia/blob/main/content/altinn-3/ops/patching/containers/_index.md#gitea)
is in Norwegian. In short:

- Do not upgrade to an `x.y.0` release. Wait until the version is stable.
- Our configuration, templates and locales can break between releases. Compare
  [app.ini](files/conf/app.ini) with Gitea's `custom/conf/app.example.ini`, and [templates](files/custom/templates)
  with Gitea's `templates`, at the version you upgrade to.
- [files/locale/base](files/locale/base) holds Gitea's Norwegian translation. Update it from
  [Crowdin](https://crowdin.com/project/gitea/no) when you upgrade, checking that the keys match the new version, since
  Crowdin only has the latest. The [Dockerfile](Dockerfile) takes the English locale from the Gitea image.
- Do not edit the base translation, since the next upgrade overwrites it. Submit a change to Crowdin, or add it to
  our own locales in [files/locale/custom](files/locale/custom). Check that their keys are still in use.
