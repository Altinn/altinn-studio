import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioPageError } from './StudioPageError';

const meta = {
  title: 'Components/StudioPageError',
  component: StudioPageError,
} satisfies Meta<typeof StudioPageError>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Alert title',
    message: 'Alert message',
  },
};
