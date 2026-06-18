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
  id: 'config',
  title: 'config',
  content: 'config',
  variant: 'config',
  showLanguageInfo: 'config',
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
    content: 'This is a plain text',
  },
} satisfies Meta<typeof DemoLayoutComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithTitle: Story = {
  args: {
    title: 'A configurable heading',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Heads up',
    content: 'This variant draws attention with a coloured accent.',
  },
};

export const WithHtml: Story = {
  args: {
    content: `<h3>This is content set with props a html, but can be html or mark down</h3>
      <p>And this is a <strong>paragraph</strong></p>
      <ul>
        <li>And this is a list item</li>
        <li>And this is another list item</li>
      </ul>`,
  },
};

export const WithMarkdown: Story = {
  args: {
    content: `### This is content set with props a text, but can be **html** or **mark down**

And this is a **paragraph**

- And this is a list item
- And this is another list item`,
  },
};

// Runtime (injected) props below — these are normally supplied by the runtime wrapper, not Studio.

export const RuntimeBoundValue: Story = {
  args: {
    dataValue: 'a value injected by the runtime wrapper',
  },
};

export const RenderedInTable: Story = {
  args: {
    title: 'Title is suppressed when rendered in a table',
    renderedInTable: true,
  },
};
