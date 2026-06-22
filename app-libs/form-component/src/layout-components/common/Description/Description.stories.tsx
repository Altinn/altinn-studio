import type { Meta, StoryObj } from '@storybook/react-vite';

import { Description } from './Description';

const meta = {
  title: 'LayoutComponents/Common/Description',
  component: Description,
  args: {
    description: 'A short description that explains the field.',
    componentId: 'example',
  },
} satisfies Meta<typeof Description>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
