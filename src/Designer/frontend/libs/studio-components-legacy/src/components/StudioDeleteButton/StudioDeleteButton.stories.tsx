import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDeleteButton } from './StudioDeleteButton';

const meta = {
  title: 'Components/StudioDeleteButton',
  component: StudioDeleteButton,
} satisfies Meta<typeof StudioDeleteButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    confirmMessage: 'Are you sure you want to delete this item?',
  },
};
