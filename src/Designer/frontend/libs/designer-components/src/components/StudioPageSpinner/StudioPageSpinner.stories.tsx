import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioPageSpinner } from './StudioPageSpinner';

const meta = {
  title: 'Components/StudioPageSpinner',
  component: StudioPageSpinner,
} satisfies Meta<typeof StudioPageSpinner>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    spinnerTitle: 'Loading user profile',
    showSpinnerTitle: true,
  },
};
