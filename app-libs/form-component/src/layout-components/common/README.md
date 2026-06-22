# `common/`

This directory contains components and utilities that are reused between layout components.

This means that they are allowed to use utilities like `useTranslation`, so they are not 100% dumb like the components in app-components.

- `HelpTextContainer` — the help-text tooltip used by several components.
- `storybook/` — the shared Storybook docs setup described below.

Most likely these will be components migrated from `src/App/frontend/src/components` and we hope to move many of them here.

## Storybook docs setup

Layout components share a single docs page layout so every component's Storybook page looks the
same: the **Studio configurable** props are shown under a heading, and the **Runtime (injected)**
props in a collapsed section below them. Both are plain controls tables (not `table.category`
sections), and every prop stays editable.

`DemoLayoutComponent` is the reference example for this setup. To give a component this page, two
pieces are needed.

### 1. Classify the props

In the stories file, declare a `*_PROP_CATEGORIES` map (this is docs-only metadata, so it lives with
the stories rather than in the runtime component). The `satisfies PropCategories<TProps>` keeps it
exhaustive — adding a prop without classifying it is a compile error. Because every named export in
a stories file is treated as a story (CSF), list the map in `excludeStories` so Storybook doesn't
render it as one.

```ts
import type { Meta } from '@storybook/react-vite';

import { MyComponent } from './MyComponent';
import type { MyComponentProps } from './MyComponent';
import type { PropCategories } from '../common/storybook';

export const MY_COMPONENT_PROP_CATEGORIES = {
  id: 'config', // configurable in Studio
  title: 'config',
  value: 'runtime', // injected by the runtime wrapper
} satisfies PropCategories<MyComponentProps>;

const meta = {
  title: 'LayoutComponents/MyComponent',
  component: MyComponent,
  excludeStories: ['MY_COMPONENT_PROP_CATEGORIES'],
  // ...
} satisfies Meta<typeof MyComponent>;
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
import { MY_COMPONENT_PROP_CATEGORIES } from './MyComponent.stories';

<Meta of={MyComponentStories} />

<LayoutComponentDocs categories={MY_COMPONENT_PROP_CATEGORIES} />
```

That's it — `LayoutComponentDocs` renders the title, description, primary preview, the two grouped
controls tables and the remaining stories. See `DemoLayoutComponent/` for a working example.
