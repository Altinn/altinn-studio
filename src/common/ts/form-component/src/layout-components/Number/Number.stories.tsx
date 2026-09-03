import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Number } from './Number';
import type { NumberProps } from './Number';

export const NUMBER_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  help: 'text',
  value: 'content',
  formatting: 'content',
  icon: 'content',
  direction: 'content',
  componentId: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
  hideLabel: 'runtime',
} satisfies PropCategories<NumberProps>;

const meta = {
  title: 'LayoutComponents/Number',
  component: Number,
  excludeStories: ['NUMBER_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    direction: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    componentId: 'number-preview',
    title: 'Beløp',
    value: 12345.67,
    direction: 'horizontal',
  },
} satisfies Meta<typeof Number>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Vertical: Story = {
  args: {
    direction: 'vertical',
  },
};

export const WithoutTitle: Story = {
  args: {
    title: undefined,
  },
};
