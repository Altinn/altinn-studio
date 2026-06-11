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
   * The component's prop classification (e.g. `INPUT_PROP_CATEGORIES`). Studio-configurable and
   * runtime props are rendered in separate controls tables, each under its own heading.
   */
  categories: Record<string, PropCategory>;
}

/**
 * Shared docs page for layout components. Drop it into a component's `*.mdx` (below a
 * `<Meta of={...} />`) to get the standard layout: title, description, primary preview, then one
 * controls table per prop group under a real markdown heading — a heading that is NOT a collapse
 * toggle, unlike a Storybook `table.category`. Every prop stays editable. The runtime section is
 * omitted when a component has no runtime props.
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
        <>
          <h2>Runtime (injected)</h2>
          <p>
            Internal wiring supplied by the runtime wrapper — data binding, display overrides,
            validation state and event handlers. Not part of the Studio configuration.
          </p>
          <Controls include={runtimeKeys} />
        </>
      )}

      <Stories />
    </>
  );
}
