import type { Meta, StoryObj } from '@storybook/react-vite';

import { OptionalIndicator } from './OptionalIndicator';

const meta = {
  title: 'LayoutComponents/Common/OptionalIndicator',
  component: OptionalIndicator,
  args: {
    showOptionalMarking: true,
  },
} satisfies Meta<typeof OptionalIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
