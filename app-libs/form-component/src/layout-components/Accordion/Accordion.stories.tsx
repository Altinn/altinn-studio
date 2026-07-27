import { ParagraphText } from '@app/form-component/app-components';
import { List } from '@digdir/designsystemet-react';
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
  // Text resource — Studio "Tekst" section (textResourceBindings)
  title: 'text',
  // Configurable options — Studio "Innhold" section
  openByDefault: 'content',
  componentId: 'content',
  innerGrid: 'content',
  validationGrid: 'content',
  // Injected by the runtime wrapper — not part of the Studio configuration
  children: 'runtime',
  className: 'runtime',
  renderAsItem: 'runtime',
  validationMessages: 'runtime',
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
      <ParagraphText>
        Accordion content goes here. Use this to hide secondary information until the user wants to
        see it.
      </ParagraphText>
    ),
  },
};

export const OpenByDefault: Story = {
  args: {
    openByDefault: true,
    children: (
      <ParagraphText>This accordion starts expanded because openByDefault is true.</ParagraphText>
    ),
  },
};

export const WithMultipleChildren: Story = {
  args: {
    children: (
      <>
        <ParagraphText>First paragraph of content.</ParagraphText>
        <ParagraphText>Second paragraph of content.</ParagraphText>
        <List.Unordered>
          <List.Item>And a list item</List.Item>
          <List.Item>And another list item</List.Item>
        </List.Unordered>
      </>
    ),
  },
};

export const WithoutCard: Story = {
  args: {
    renderAsItem: true,
    children: (
      <ParagraphText>
        Rendered without the Card wrapper, as it would appear inside an AccordionGroup.
      </ParagraphText>
    ),
  },
};
