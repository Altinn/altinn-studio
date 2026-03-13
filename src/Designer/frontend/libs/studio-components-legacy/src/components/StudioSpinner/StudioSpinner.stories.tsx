import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioSpinner } from './StudioSpinner';

const meta = {
  title: 'Components/StudioSpinner',
  component: StudioSpinner,
  argTypes: {
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
    },
    variant: {
      control: 'radio',
      options: ['default', 'interaction', 'inverted'],
    },
  },
} satisfies Meta<typeof StudioSpinner>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    spinnerTitle: 'Text',
    showSpinnerTitle: false,
    size: 'medium',
    variant: 'interaction',
  },
};
