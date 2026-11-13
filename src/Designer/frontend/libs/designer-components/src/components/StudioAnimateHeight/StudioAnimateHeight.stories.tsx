import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioAnimateHeight } from './StudioAnimateHeight';

const meta = {
  title: 'Components/StudioAnimateHeight',
  component: StudioAnimateHeight,
} satisfies Meta<typeof StudioAnimateHeight>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Change the open prop to see the animation in action',
    open: true,
  },
};
