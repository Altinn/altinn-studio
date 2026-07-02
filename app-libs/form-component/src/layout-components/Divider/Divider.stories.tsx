import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Divider } from './Divider';
import type { DividerProps } from './Divider';

export const DIVIDER_PROP_CATEGORIES = {
  componentId: 'content',
  innerGrid: 'content',
  validationGrid: 'content',
  validationMessages: 'runtime',
} satisfies PropCategories<DividerProps>;

const meta = {
  title: 'LayoutComponents/Divider',
  component: Divider,
  excludeStories: ['DIVIDER_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'divider-preview',
  },
} satisfies Meta<typeof Divider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const BetweenContent: Story = {
  render: (args) => (
    <div>
      <p>Innhold over skillelinjen</p>
      <Divider {...args} />
      <p>Innhold under skillelinjen</p>
    </div>
  ),
};
