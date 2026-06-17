This directory contains components and utilities that are reused between layout components.

This means that they are allowed to use utilities like `useTranslation`, so they are not 100% dumb like the components in app-components.

- `HelpTextContainer` — the help-text tooltip used by several components.
- `storybook/` — the shared Storybook docs setup that splits a component's Studio-configurable props from its runtime (injected) props (see the layout-components README).

Most likely these will be components migrated from `src/App/frontend/src/components` and we hope to move many of them here.
