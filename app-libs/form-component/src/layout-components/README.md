# Layout components

Layout components are the form-building blocks an app is composed of. Each one maps to a component
type that can be configured in Altinn Studio and rendered by the runtime. Unlike the dumb components
in `app-components`, layout components are allowed to use utilities like `useTranslation`.

### `common/`

Shared building blocks reused between layout components (see [`common/README.md`](./common/README.md)):

- `HelpTextContainer` — the help-text tooltip used by several components.
- `storybook/` — the shared Storybook docs setup described below.

## Storybook docs setup

Layout components share a single docs page layout so every component's Storybook page looks the
same: the **Studio configurable** props are shown under a heading, and the **Runtime (injected)**
props in a collapsed section below them. Both are plain controls tables (not `table.category`
sections), and every prop stays editable.

`DemoLayoutComponent` is the reference example for this setup. To give a component this page, two
pieces are needed.

### 1. Classify the props

In the component file, declare a `*_PROP_CATEGORIES` map next to the props interface. The
`satisfies PropCategories<TProps>` keeps it exhaustive — adding a prop without classifying it is a
compile error.

```ts
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';

export interface MyComponentProps {
  id: string;
  title?: string;
  value?: string;
}

export const MY_COMPONENT_PROP_CATEGORIES = {
  id: 'config', // configurable in Studio
  title: 'config',
  value: 'runtime', // injected by the runtime wrapper
} satisfies PropCategories<MyComponentProps>;
```

- `config` — props that map 1:1 to the component's Studio-configurable options.
- `runtime` — internal wiring supplied by the runtime wrapper (data binding, display overrides,
  validation state, event handlers).

A component with no runtime props classifies everything as `config`; the "Runtime (injected)"
section is then omitted automatically.

### 2. Add the `*.mdx` docs page

Create `MyComponent.mdx` next to the stories. It attaches the docs page and renders the shared
layout from the categories map:

```mdx
import { Meta } from '@storybook/addon-docs/blocks';

import { LayoutComponentDocs } from '../common/storybook';
import * as MyComponentStories from './MyComponent.stories';
import { MY_COMPONENT_PROP_CATEGORIES } from './MyComponent';

<Meta of={MyComponentStories} />

<LayoutComponentDocs categories={MY_COMPONENT_PROP_CATEGORIES} />
```

That's it — `LayoutComponentDocs` renders the title, description, primary preview, the two grouped
controls tables and the remaining stories. See `DemoLayoutComponent/` for a working example.
