import type { Meta, StoryObj } from '@storybook/react-vite';

import { RequiredIndicator } from './RequiredIndicator';

const meta = {
  title: 'LayoutComponents/Common/RequiredIndicator',
  component: RequiredIndicator,
  args: {
    required: true,
  },
} satisfies Meta<typeof RequiredIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
