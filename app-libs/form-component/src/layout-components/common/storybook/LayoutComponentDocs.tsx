import {
  Controls,
  Description,
  Primary,
  Stories,
  Subtitle,
  Title,
} from '@storybook/addon-docs/blocks';

import { groupPropKeys, STUDIO_CATEGORIES } from './propCategories';
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
  const groups = groupPropKeys(categories);

  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      <Primary />

      <h2>Konfigurerbart i Studio</h2>
      <p>Egenskaper som kan konfigureres i Altinn Studio.</p>
      {STUDIO_CATEGORIES.map(({ category, label }) =>
        groups[category].length > 0 ? (
          <section key={category}>
            <h3>{label}</h3>
            <Controls include={groups[category]} />
          </section>
        ) : null,
      )}

      {groups.runtime.length > 0 && (
        <details>
          <summary>
            <h2 style={{ display: 'inline' }}>Kjøretid (injisert)</h2>
          </summary>
          <p>
            Intern kobling levert av kjøretids-wrapperen — databinding, visningsoverstyringer,
            valideringstilstand og hendelseshåndterere. Ikke en del av Studio-konfigurasjonen.
          </p>
          <Controls include={groups.runtime} />
        </details>
      )}

      <Stories />
    </>
  );
}
