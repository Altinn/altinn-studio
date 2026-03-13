import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioTextfield } from './StudioTextfield';

const meta = {
  title: 'Components/StudioTextfield',
  component: StudioTextfield,
  argTypes: {
    required: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof StudioTextfield>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    label: 'Textfield',
    description: '',
    error: '',
    required: false,
    tagText: 'Må fylles ut',
  },
};
