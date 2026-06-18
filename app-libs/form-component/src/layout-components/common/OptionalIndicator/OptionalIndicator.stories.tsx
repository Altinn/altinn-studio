import type { Meta, StoryObj } from '@storybook/react-vite';

import { OptionalIndicator } from './OptionalIndicator';

const meta = {
  title: 'LayoutComponents/Common/OptionalIndicator',
  component: OptionalIndicator,
  parameters: {
    layout: 'centered',
  },
  args: {
    showOptionalMarking: true,
  },
} satisfies Meta<typeof OptionalIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Optional: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
};
