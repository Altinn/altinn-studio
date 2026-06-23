import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Accordion } from './Accordion';
import type { AccordionProps } from './Accordion';

/**
 * Sorts each prop into a Storybook docs group, consumed by Accordion.mdx. This is docs-only metadata,
 * so it lives with the stories rather than in the component. `satisfies PropCategories<AccordionProps>`
 * makes it exhaustive — a new prop must be classified here.
 */
export const ACCORDION_PROP_CATEGORIES = {
  title: 'config',
  openByDefault: 'config',
  children: 'runtime',
  className: 'runtime',
  renderAsItem: 'runtime',
} satisfies PropCategories<AccordionProps>;

const meta = {
  title: 'LayoutComponents/Accordion',
  component: Accordion,
  // ACCORDION_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['ACCORDION_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    title: 'What is included in this section?',
  },
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: (
      <p>
        Accordion content goes here. Use this to hide secondary information until the user wants to
        see it.
      </p>
    ),
  },
};

export const OpenByDefault: Story = {
  args: {
    openByDefault: true,
    children: <p>This accordion starts expanded because openByDefault is true.</p>,
  },
};

export const WithMultipleChildren: Story = {
  args: {
    children: (
      <>
        <p>First paragraph of content.</p>
        <p>Second paragraph of content.</p>
        <ul>
          <li>And a list item</li>
          <li>And another list item</li>
        </ul>
      </>
    ),
  },
};

export const WithoutCard: Story = {
  args: {
    renderAsItem: true,
    children: (
      <p>Rendered without the Card wrapper, as it would appear inside an AccordionGroup.</p>
    ),
  },
};
