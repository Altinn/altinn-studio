import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioBadge } from './StudioBadge';

const meta = {
  title: 'Components/StudioBadge',
  component: StudioBadge,
} satisfies Meta<typeof StudioBadge>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
