import type { PropsWithChildren } from 'react';

import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { GroupLayout } from './GroupLayout';
import type { GroupLayoutProps } from './GroupLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by GroupLayout.mdx.
 */
export const GROUP_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  help: 'text',
  componentId: 'content',
  headingLevel: 'content',
  groupingIndicator: 'content',
  children: 'content',
  baseComponentId: 'runtime',
  containerId: 'runtime',
  containerRef: 'runtime',
  isNested: 'runtime',
  isSummary: 'runtime',
} satisfies PropCategories<PropsWithChildren<GroupLayoutProps>>;

const meta = {
  title: 'LayoutComponents/Group',
  component: GroupLayout,
  excludeStories: ['GROUP_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <StaticLanguageTranslatorProvider language='nb'>
        <Story />
      </StaticLanguageTranslatorProvider>
    ),
  ],
  argTypes: {
    groupingIndicator: {
      control: 'inline-radio',
      options: [undefined, 'indented', 'panel'],
    },
    headingLevel: {
      control: 'inline-radio',
      options: [2, 3, 4, 5, 6],
    },
  },
  args: {
    componentId: 'group-preview',
    title: 'Opplysninger om deg',
    children: (
      <>
        <p>Første komponent i gruppen</p>
        <p>Andre komponent i gruppen</p>
      </>
    ),
  },
} satisfies Meta<typeof GroupLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    description: 'Fyll ut feltene under.',
    help: 'Vi bruker opplysningene til å kontakte deg.',
  },
};

export const Panel: Story = {
  args: {
    groupingIndicator: 'panel',
  },
};

export const Indented: Story = {
  args: {
    groupingIndicator: 'indented',
  },
};

export const InSummary: Story = {
  args: {
    description: 'Vises ikke i oppsummeringen.',
    groupingIndicator: 'panel',
    isSummary: true,
  },
};
