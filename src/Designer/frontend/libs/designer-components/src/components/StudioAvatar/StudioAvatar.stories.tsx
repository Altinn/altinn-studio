import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioAvatar } from './StudioAvatar';

const meta = {
  title: 'Components/StudioAvatar',
  component: StudioAvatar,
} satisfies Meta<typeof StudioAvatar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
