import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDecimalInput } from './StudioDecimalInput';

const meta = {
  title: 'Components/StudioDecimalInput',
  component: StudioDecimalInput,
  argTypes: {
    value: {
      control: 'text',
    },
  },
} satisfies Meta<typeof StudioDecimalInput>;
export default meta;

type Story = StoryObj<typeof StudioDecimalInput>;

export const Preview: Story = {
  args: {
    description: 'This is a decimal input',
    value: 2.3,
    label: 'Decimal input',
    validationErrorMessage: 'Your custom error message!',
  },
};
