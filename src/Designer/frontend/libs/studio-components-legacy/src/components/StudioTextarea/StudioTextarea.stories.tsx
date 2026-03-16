import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioTextarea } from './StudioTextarea';

const meta = {
  title: 'Components/StudioTextarea',
  component: StudioTextarea,
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof StudioTextarea>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    label: 'My awesome label',
    placeholder: 'Type something here...',
    error: '',
    hideLabel: false,
    size: 'sm',
  },
};
