import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioNotFoundPage } from './StudioNotFoundPage';

const meta = {
  title: 'Components/StudioNotFoundPage',
  component: StudioNotFoundPage,
} satisfies Meta<typeof StudioNotFoundPage>;
export default meta;

type Story = StoryObj<typeof StudioNotFoundPage>;

export const Preview: Story = {};
