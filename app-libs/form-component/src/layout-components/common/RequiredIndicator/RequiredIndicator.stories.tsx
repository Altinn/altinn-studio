import type { Meta, StoryObj } from '@storybook/react-vite';

import { RequiredIndicator } from './RequiredIndicator';

const meta = {
  title: 'LayoutComponents/Common/RequiredIndicator',
  component: RequiredIndicator,
  parameters: {
    layout: 'centered',
  },
  args: {
    required: true,
  },
} satisfies Meta<typeof RequiredIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Required: Story = {};

export const NotRequired: Story = {
  args: {
    required: false,
  },
};
