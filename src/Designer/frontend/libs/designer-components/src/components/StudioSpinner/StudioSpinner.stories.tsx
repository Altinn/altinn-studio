import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioSpinner } from './StudioSpinner';

const meta = {
  title: 'Components/StudioSpinner',
  component: StudioSpinner,
  argTypes: {
    'data-size': {
      control: 'radio',
      options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof StudioSpinner>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    'aria-label': 'Loading',
    'data-size': 'sm',
  },
};
