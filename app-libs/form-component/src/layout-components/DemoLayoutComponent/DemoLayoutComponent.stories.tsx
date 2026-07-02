import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DemoLayoutComponent } from './DemoLayoutComponent';
import type { DemoLayoutComponentProps } from './DemoLayoutComponent';

/**
 * Sorts each prop into a Storybook docs group, consumed by DemoLayoutComponent.mdx. This is docs-only
 * metadata, so it lives with the stories rather than in the component. `satisfies
 * PropCategories<DemoLayoutComponentProps>` makes it exhaustive — a new prop must be classified here.
 */
export const DEMO_PROP_CATEGORIES = {
  id: 'content',
  title: 'text',
  content: 'text',
  variant: 'content',
  showLanguageInfo: 'content',
  renderedInTable: 'runtime',
  dataValue: 'runtime',
  hidden: 'runtime',
  onRendered: 'runtime',
} satisfies PropCategories<DemoLayoutComponentProps>;

// Every prop is editable and left ungrouped (no `table.category`), so the Controls panel stays flat.
// The DemoLayoutComponent.mdx docs page separates the Studio-configurable and runtime props under
// real markdown headings, driven by DEMO_PROP_CATEGORIES.
const meta = {
  title: 'LayoutComponents/DemoLayoutComponent',
  component: DemoLayoutComponent,
  // DEMO_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['DEMO_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['info', 'warning', 'success'] },
  },
  args: {
    id: 'demo-preview',
    content: 'Dette er ren tekst',
  },
} satisfies Meta<typeof DemoLayoutComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithTitle: Story = {
  args: {
    title: 'En konfigurerbar overskrift',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Vær oppmerksom',
    content: 'Denne varianten fanger oppmerksomheten med en annen farge.',
  },
};

export const WithHtml: Story = {
  args: {
    content: `<h3>Dette er innhold satt med props som html, men kan være html eller markdown</h3>
      <p>Og dette er et <strong>avsnitt</strong></p>
      <ul>
        <li>Og dette er et listeelement</li>
        <li>Og dette er enda et listeelement</li>
      </ul>`,
  },
};

export const WithMarkdown: Story = {
  args: {
    content: `### Dette er innhold satt med props som tekst, men kan være **html** eller **markdown**

Og dette er et **avsnitt**

- Og dette er et listeelement
- Og dette er enda et listeelement`,
  },
};

// Runtime (injected) props below — these are normally supplied by the runtime wrapper, not Studio.

export const RuntimeBoundValue: Story = {
  args: {
    dataValue: 'en verdi injisert av runtime-wrapperen',
  },
};

export const RenderedInTable: Story = {
  args: {
    title: 'Tittelen skjules når den vises i en tabell',
    renderedInTable: true,
  },
};
