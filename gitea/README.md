# About upgrading Gitea

The routine for upgrading Gitea can be found [here](https://github.com/Altinn/altinnpedia/blob/main/content/altinn-3/ops/patching/containers/_index.md#gitea) in Norwegian, but in short :

> :warning:
> Do not upgrade to the first patch version `x.x.0`, wait until the major version is stable

> :warning:
> Ensure all custom files (configuration, templates, and locales) are up to date, as they may change between releases

## Updating configuration

Ensure that our custom configuration is up to date by comparing it with the app.example.ini file provided by Gitea (see: https://github.com/go-gitea/gitea/blob/release/v{VERSION}/custom/conf/app.example.ini).

## Updating templates

Ensure that our custom templates are up to date by comparing them with the templates from Gitea (see: https://github.com/go-gitea/gitea/tree/release/v{VERSION}/templates).

## Updating locales

### Updating original locales from Gitea

The files located in [./files/locale/base](./files/locale/base) are the original translations from Gitea. They must be updated when upgrading Gitea to a newer version.

- Update [locale_en-US.ini](./files/locale/base/locale_en-US.ini) using https://github.com/go-gitea/gitea/tree/release/v{VERSION}/options/locale/locale_en-US.ini.

- Update [locale_nb-NO.ini](./files/locale/base/locale_nb-NO.ini) using [Crowdin](https://crowdin.com/project/gitea/no). Crowdin only contains the latest version, so you must ensure that the keys match the version your are upgrading to.

> :warning:
> Do not make custom changes to these files, as they will be overwritten during future upgrades. If you need to make changes, you can either :
>
> - Submit your changes via [Crowdin](https://crowdin.com/project/gitea/no) for the Norwegian version, and download the updated file that includes your changes
> - Add custom translations to our custom locale files (see below)

### Updating custom locales

The files located in [./files/locale/custom](./files/locale/custom) are our custom locales for Studio. Ensure that all keys in these files are still in use when upgrading Gitea to a newer version.

## Useful commands

Reload config:

```bash
docker rm --force studio-repositories
docker rmi --force repositories:latest
docker compose -f ../compose.yaml up -d
```
