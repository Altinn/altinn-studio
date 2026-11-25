# Shared TypeScript libraries

These libraries hold the form rendering, form logic and layout contracts of Altinn apps, and the HTTP client that the
frontends share. The form libraries are moving here from the [App frontend](../../App/frontend/README.md) so that
Designer and other products can reuse them. The form libraries keep the App frontend's `@app/` package scope while they
are in active development. `http-client` has the `@studio/` scope.

- [form-component](form-component/README.md) has the React components that render forms. It explains what belongs in
  it and what belongs in `form-engine`.
- `form-engine` is for form logic that does not depend on React.
- `language` has the built-in texts of Altinn apps in each language, and helpers for them.
- `layout-contract` has the types and JSON schemas for app layouts and other app configuration files.
- `http-client` has a client on top of `fetch`. Each frontend creates its own client and adds what its backend needs
  as interceptors. `addXsrfToken` sends the XSRF header that both the Designer and app backends check, and the rest
  stays in the frontends, such as Designer's redirect to the Gitea login.

The App frontend uses all of them except `http-client`. Designer and the
[Studio Assistant](../../AI/assistant/README.md) use `layout-contract`, and Designer uses `http-client`. The layout
components mirror what Designer offers, so a change to them can affect both apps and
Designer's preview.

The App frontend generates most of `layout-contract` from its component definitions. To change the generated files,
change the definitions and run `yarn gen` in the App frontend. Its CI fails when the generated files are out of date.

The package scripts in this directory run the checks for all the packages.

## Making a package usable as a dependency

Consumers add a package as `workspace:*` in their `package.json`, and need nothing else.

- Import the package's own files with relative paths. Importing internal files by the package name only works through
  an alias that every consumer would have to copy.
- Export what consumers use from `index.ts`, or list it in `exports` in `package.json`. Consumers can then only depend
  on what the package makes public.
- List every package the code imports in the package's own `package.json`.
- Make a package a peer dependency when the consumer must share the same copy, such as React and the design system.
  Two copies of React break hooks and context. Also list it as a dev dependency, so the package's own tests and
  Storybook can run.
