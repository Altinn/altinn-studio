import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioActionCloseButton } from './StudioActionCloseButton';
import { action } from 'storybook/actions';

const meta = {
  title: 'Components/StudioActionCloseButton',
  component: StudioActionCloseButton,
} satisfies Meta<typeof StudioActionCloseButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    onClick: action('onClick'),
    variant: 'secondary',
  },
};
