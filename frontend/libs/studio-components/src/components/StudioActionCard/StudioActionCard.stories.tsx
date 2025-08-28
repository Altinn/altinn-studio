import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioActionCard } from './StudioActionCard';
import { action } from 'storybook/actions';

const meta: Meta<typeof StudioActionCard> = {
  title: 'Components/StudioActionCard',
  component: StudioActionCard,
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    onAction: action('onAction'),
    label: 'Add new action',
  },
};
