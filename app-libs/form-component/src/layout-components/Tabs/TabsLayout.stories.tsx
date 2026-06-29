import { ParagraphText } from '@app/form-component/app-components';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TabsLayout } from './TabsLayout';
import type { TabsLayoutProps } from './TabsLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by TabsLayout.mdx. This is docs-only metadata,
 * so it lives with the stories rather than in the component. `satisfies PropCategories<TabsLayoutProps>`
 * makes it exhaustive — a new prop must be classified here.
 */
export const TABS_PROP_CATEGORIES = {
  size: 'content',
  tabs: 'content',
  activeTab: 'runtime',
  onActiveTabChange: 'runtime',
  componentId: 'content',
  innerGrid: 'content',
  validationGrid: 'content',
  validationMessages: 'runtime',
} satisfies PropCategories<TabsLayoutProps>;

const meta = {
  title: 'LayoutComponents/Tabs',
  component: TabsLayout,
  excludeStories: ['TABS_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
  args: {
    componentId: 'tabs-preview',
    tabs: [
      {
        id: 'tab1',
        title: 'First tab',
        content: <ParagraphText>Content of first tab</ParagraphText>,
      },
      {
        id: 'tab2',
        title: 'Second tab',
        content: <ParagraphText>Content of second tab</ParagraphText>,
      },
    ],
  },
} satisfies Meta<typeof TabsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithIcon: Story = {
  args: {
    tabs: [
      {
        id: 'tab1',
        title: 'Tab with icon',
        icon: 'https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/svg.svg',
        content: <ParagraphText>Content with icon</ParagraphText>,
      },
      {
        id: 'tab2',
        title: 'Another tab',
        content: <ParagraphText>Second tab content</ParagraphText>,
      },
    ],
  },
};

export const SmallSize: Story = {
  args: {
    size: 'small',
  },
};

export const LargeSize: Story = {
  args: {
    size: 'large',
  },
};

export const WithValidation: Story = {
  args: {
    validationMessages: <span style={{ color: 'red' }}>Validation error in tabs</span>,
  },
};
