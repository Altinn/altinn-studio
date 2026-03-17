import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioTextfield } from './StudioTextfield';

const meta = {
  title: 'Components/StudioTextfield',
  component: StudioTextfield,
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof StudioTextfield>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    label: 'Textfield',
    placeholder: '',
    error: '',
    size: 'sm',
  },
};
