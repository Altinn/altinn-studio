## Script to fetch all running Altinn 3 apps

This script fetches all repositories and source code for running Altinn 3 apps in the tt02 and prod environments, and makes sure they are updated to the latest released version in that environment.

Requires `bash`, `curl`, `jq` and `git`.

1. Pick a suitable empty folder to check out the code in. Keep it outside this repository, since every app becomes its own Git repository.
2. Run the script from the repository root, pointing it at that folder (we chose `all-apps`):

```sh
mkdir ~/all-apps
./src/tools/altinn-fetch-apps/fetch.sh ~/all-apps
```

Running the script again updates the apps that are already checked out. API responses are cached in `.cache` inside the target folder for an hour.

## Running verifications

You now have all the files for all the apps on disk, and can use VS Code or other search tools to find usages of APIs, or whatever else you want to verify.

### Use test code from the app frontend

[`src/App/frontend`](../../App/frontend) contains example code that checks the status of various things in all apps.
In `src/App/frontend`, copy `template.env` to `.env` (if you haven't done so already) and set `ALTINN_ALL_APPS_DIR` to an absolute path to the folder you created with all the apps (e.g. `all-apps`).
Run tests that use this concept, e.g. `src/utils/layout/schema.test.ts`. To check, for example, which apps set a given parameter on their Input/TextArea components, you can extend the test with a bit of your own code:

```ts
for (const component of (layout as any).data.layout) {
  if (component.type.toLowerCase() === 'input' || component.type.toLowerCase() === 'textarea') {
    if (component.maxLength !== undefined) {
      debugger;
    }
  }
}
```

Running this with the debugger attached finds all components that set `maxLength`. Remember to check component types regardless of upper/lower case. The app frontend normalizes this when it parses layouts, so the rest of the code doesn't have to, but these layout files have not been parsed that way yet.

### TODO

- Delete checked-out apps no longer in the environment
