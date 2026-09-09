import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Lommebok } from './Lommebok';
import type { LommebokProps } from './Lommebok';

export const LOMMEBOK_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  help: 'text',
  componentId: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
} satisfies PropCategories<LommebokProps>;

const meta = {
  title: 'LayoutComponents/Lommebok',
  component: Lommebok,
  excludeStories: ['LOMMEBOK_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'lommebok-preview',
    title: 'Lommebok',
  },
} satisfies Meta<typeof Lommebok>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithoutTitle: Story = {
  args: {
    title: undefined,
  },
};
