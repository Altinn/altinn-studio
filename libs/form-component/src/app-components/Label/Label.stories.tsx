import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './Label';

const meta = {
  title: 'AppComponents/Label',
  component: Label,
  args: {
    label: 'First name',
    htmlFor: 'first-name',
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Required: Story = {
  args: {
    required: true,
    requiredIndicator: <span> *</span>,
  },
};

export const Optional: Story = {
  args: {
    required: false,
    optionalIndicator: <span> (valgfri)</span>,
  },
};

export const WithDescription: Story = {
  args: {
    description: <span>Enter the name as written in your passport.</span>,
  },
};

export const WithField: Story = {
  args: {
    children: (
      <input
        id='first-name'
        type='text'
      />
    ),
  },
};
