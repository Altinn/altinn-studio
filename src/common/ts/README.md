# Shared TypeScript libraries

These libraries hold the form rendering, form logic and layout contracts of Altinn apps. They are moving here from
the [App frontend](../../App/frontend/README.md) so that Designer and other products can reuse them. They keep the
App frontend's `@app/` package scope while they are in active development.

- [form-component](form-component/README.md) has the React components that render forms. It explains what belongs in
  it and what belongs in `form-engine`.
- `form-engine` is for form logic that does not depend on React.
- `language` has the built-in texts of Altinn apps in each language, and helpers for them.
- `layout-contract` has the types and JSON schemas for app layouts and other app configuration files.

The App frontend uses all of them. Designer and the [Studio Assistant](../../AI/assistant/README.md) use
`layout-contract`. The layout components mirror what Designer offers, so a change to them can affect both apps and
Designer's preview.

The App frontend generates most of `layout-contract` from its component definitions. To change the generated files,
change the definitions and run `yarn gen` in the App frontend. Its CI fails when the generated files are out of date.

The package scripts in this directory run the checks for all four packages.
