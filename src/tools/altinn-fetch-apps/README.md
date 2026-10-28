# Fetch all apps

[`fetch.sh`](fetch.sh) clones every Altinn 3 app that runs in tt02 and production, and checks out the commit of the
version deployed there. Use the result to search across all apps, for example to see who uses an API before you
change it. It needs `bash`, `curl`, `jq` and `git`.

The script asks each service owner's `kuberneteswrapper` which apps it runs and at which version, and then finds the
commit behind that version in the releases of altinn.studio, or of dev.altinn.studio when altinn.studio has none.

## Usage

Create an empty folder outside this repository, since every app becomes its own Git repository, and pass it to the
script:

```sh
mkdir ~/all-apps
./src/tools/altinn-fetch-apps/fetch.sh ~/all-apps
```

To fetch from fewer environments, pass a comma-separated list as the second argument or set `FETCH_ENVIRONMENTS`. The
argument wins:

```sh
./src/tools/altinn-fetch-apps/fetch.sh ~/all-apps tt02
FETCH_ENVIRONMENTS=prod ./src/tools/altinn-fetch-apps/fetch.sh ~/all-apps
```

- Running the script again updates the apps that are already there. It does not delete apps that no longer run in
  an environment.
- The script caches API responses for an hour in `.cache` inside the target folder.
- When an app fails to clone, the script leaves `fetch-failed.txt` in its folder and skips the app on later runs.
  Delete the folder to try again.

The script runs on both macOS and Linux, so it must work with both the BSD and the GNU versions of tools such as
`stat`.

## Tests across all apps

App frontend has tests that read every app in the folder, such as
[`schema.test.ts`](../../App/frontend/src/utils/layout/schema.test.ts). Set `ALTINN_ALL_APPS_DIR` in
`src/App/frontend/.env`, copied from `template.env`, to the absolute path of the folder, since the file does not expand `~`.
To answer a question such as which apps set `maxLength` on an input, extend one of those tests and run it with a
debugger attached. Compare component types without regard to case, since these layouts have not been through App
frontend's parser, which normalizes them.
