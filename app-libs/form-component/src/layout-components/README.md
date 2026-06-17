# Layout components

Layout components are the form-building blocks an app is composed of. Each one maps to a component
type that can be configured in Altinn Studio and rendered by the runtime. Unlike the dumb components
in `app-components`, layout components are allowed to use utilities like `useTranslation`.

### `common/`

Shared building blocks reused between layout components (see [`common/README.md`](./common/README.md)):

- `HelpTextContainer` — the help-text tooltip used by several components.
- `storybook/` — the shared Storybook docs setup that splits a component's Studio-configurable props
  from its runtime (injected) props. See [`common/README.md`](./common/README.md) for how to add it
  to a component.
