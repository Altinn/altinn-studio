import {
  Controls,
  Description,
  Primary,
  Stories,
  Subtitle,
  Title,
} from '@storybook/addon-docs/blocks';

import { splitPropKeys } from './propCategories';
import type { PropCategory } from './propCategories';

interface LayoutComponentDocsProps {
  /**
   * The component's prop classification (e.g. `DEMO_PROP_CATEGORIES`). The Studio-configurable props
   * are shown under a heading; the runtime props in a collapsible section below it.
   */
  categories: Record<string, PropCategory>;
}

/**
 * Shared docs page for layout components. Drop it into a component's `*.mdx` (below a
 * `<Meta of={...} />`) to get the standard layout: title, description, primary preview, the
 * Studio-configurable props under a heading, then the runtime props in a collapsed `<details>`
 * section. Every prop stays editable. The runtime section is omitted when a component has none.
 */
export function LayoutComponentDocs({ categories }: LayoutComponentDocsProps) {
  const { configKeys, runtimeKeys } = splitPropKeys(categories);

  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      <Primary />

      <h2>Studio configurable</h2>
      <p>Props that are configurable in Altinn Studio.</p>
      <Controls include={configKeys} />

      {runtimeKeys.length > 0 && (
        <details>
          <summary>
            <h2 style={{ display: 'inline' }}>Runtime (injected)</h2>
          </summary>
          <p>
            Internal wiring supplied by the runtime wrapper — data binding, display overrides,
            validation state and event handlers. Not part of the Studio configuration.
          </p>
          <Controls include={runtimeKeys} />
        </details>
      )}

      <Stories />
    </>
  );
}
