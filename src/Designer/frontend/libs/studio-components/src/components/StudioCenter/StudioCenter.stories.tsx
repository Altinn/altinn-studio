import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCenter } from './StudioCenter';

const meta = {
  title: 'Components/StudioCenter',
  component: StudioCenter,
} satisfies Meta<typeof StudioCenter>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'This text is centered vertically and horizontally',
  },
};
