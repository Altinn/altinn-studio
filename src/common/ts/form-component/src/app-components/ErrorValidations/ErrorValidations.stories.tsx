import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorValidations } from './ErrorValidations';

const meta = {
  title: 'AppComponents/ErrorValidations',
  component: ErrorValidations,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ErrorValidations>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: {
    validations: [{ id: '1', message: 'You must fill in this field.' }],
  },
};

export const Multiple: Story = {
  args: {
    validations: [
      { id: '1', message: 'You must fill in this field.' },
      { id: '2', message: 'The value must be a valid email address.' },
    ],
  },
};
