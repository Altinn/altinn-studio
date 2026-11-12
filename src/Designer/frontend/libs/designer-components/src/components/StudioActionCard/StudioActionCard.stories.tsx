import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioActionCard } from './StudioActionCard';
import { action } from 'storybook/actions';

const meta = {
  title: 'Components/StudioActionCard',
  component: StudioActionCard,
} satisfies Meta<typeof StudioActionCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    onAction: action('onAction'),
    label: 'Add new action',
  },
};
