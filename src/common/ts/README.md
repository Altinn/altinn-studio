# Shared TypeScript libraries

These libraries hold the form rendering, form logic and layout contracts of Altinn apps. They are moving here from
[App frontend](../../App/frontend) so that Designer and other products can reuse them. They keep App frontend's
`@app/` package scope.

- [`form-component`](form-component/README.md) has the React components that render forms.
- `form-engine` is for form logic that does not depend on React.
- `language` has the built-in texts of Altinn apps in each language, and helpers for them.
- `layout-contract` has the types and JSON schemas for app layouts and other app configuration files.

App frontend uses all of them. Designer and the [Studio assistant](../../AI/assistant) use `layout-contract`.

App frontend generates most of `layout-contract` from its component definitions. To change the generated files,
change the definitions and run `yarn gen` in App frontend. App frontend's CI fails when the generated files are out of
date.
