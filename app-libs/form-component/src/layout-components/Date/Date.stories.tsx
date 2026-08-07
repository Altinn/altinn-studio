import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Date } from './Date';
import type { DateProps } from './Date';

export const DATE_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  help: 'text',
  value: 'content',
  icon: 'content',
  direction: 'content',
  componentId: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
} satisfies PropCategories<DateProps>;

const meta = {
  title: 'LayoutComponents/Date',
  component: Date,
  excludeStories: ['DATE_PROP_CATEGORIES'],
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
    componentId: 'date-preview',
    title: 'Registreringsdato',
    value: '20.07.2026',
    direction: 'horizontal',
  },
} satisfies Meta<typeof Date>;

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
