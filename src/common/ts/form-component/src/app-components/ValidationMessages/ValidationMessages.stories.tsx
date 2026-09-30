import type { Meta, StoryObj } from '@storybook/react-vite';

import { ValidationMessages } from './ValidationMessages';

const meta = {
  title: 'AppComponents/ValidationMessages',
  component: ValidationMessages,
  parameters: { layout: 'padded' },
  args: { id: 'validation-messages-preview' },
} satisfies Meta<typeof ValidationMessages>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Errors: Story = {
  args: {
    validations: [
      { id: '1', severity: 'error', message: 'You must fill in this field.' },
      { id: '2', severity: 'error', message: 'The value must be a valid email address.' },
    ],
  },
};

export const Warnings: Story = {
  args: {
    validations: [
      {
        id: '1',
        severity: 'warning',
        message: 'This value looks unusual, please double-check it.',
      },
    ],
  },
};

export const Info: Story = {
  args: {
    validations: [{ id: '1', severity: 'info', message: 'This field is optional.' }],
  },
};

export const Success: Story = {
  args: {
    validations: [{ id: '1', severity: 'success', message: 'The value has been verified.' }],
  },
};

export const Mixed: Story = {
  args: {
    validations: [
      { id: '1', severity: 'error', message: 'You must fill in this field.' },
      {
        id: '2',
        severity: 'warning',
        message: 'This value looks unusual, please double-check it.',
      },
      { id: '3', severity: 'info', message: 'This field is optional.' },
      { id: '4', severity: 'success', message: 'The value has been verified.' },
    ],
  },
};
