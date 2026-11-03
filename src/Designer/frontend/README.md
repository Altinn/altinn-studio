# Designer frontend

The React apps that users work in, in [Designer](../README.md). Each app, such as `app-development` or `dashboard`,
has its own folder and build. The [Dockerfile](../Dockerfile) copies each build into the backend, which serves it from
its own path. The apps call the [backend](../backend/README.md) API.

- `packages/` holds the editors that `app-development` shows for one app, such as the UI editor and the process
  editor.
- `libs/` holds shared libraries. `@studio/components` wraps the components of
  [Designsystemet](https://designsystemet.no), and the rest of the frontend imports them from there. ESLint enforces
  this.

## Editors for v8 and v9 apps

Some editors have one package for each app version, because the apps store their configuration differently. The
package without a suffix serves v9 apps, and a package with a suffix, such as `ux-editor-v4`, serves older apps.
[UiEditor.tsx](app-development/features/uiEditor/UiEditor.tsx) and
[ProcessEditor.tsx](app-development/features/processEditor/ProcessEditor.tsx) choose the package from the app's
version. ESLint stops the packages for different versions from importing each other.
[Designer](../README.md#v8-and-v9-apps) says when we change the packages for older apps.

## Texts

Designer is in Norwegian bokmål. Add each new text to [nb.json](language/src/nb.json). `en.json` has only part of
the texts, and Designer does not offer English to users. The [language README](language/README.md) says how to keep
the files sorted.

## Development

To run an app against the local stack, see [Running Designer locally](../development/README.md#work-on-one-part).

- `yarn test <part of a path>` runs the unit tests in matching files.
- `yarn lint` does not check formatting. CI checks it with `yarn codestyle:check`, and `yarn codestyle:fix` fixes
  it.
- The end-to-end tests are in [testing/playwright](testing/playwright/README.md).

The [coding standards](docs/coding-standards.md) say how the frontend calls the backend and how we write unit tests.
