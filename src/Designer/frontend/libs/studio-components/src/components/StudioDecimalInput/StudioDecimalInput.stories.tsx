import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioDecimalInput } from './StudioDecimalInput';

type Story = StoryFn<typeof StudioDecimalInput>;

const meta: Meta = {
  title: 'Components/StudioDecimalInput',
  component: StudioDecimalInput,
  argTypes: {
    value: {
      control: 'text',
    },
  },
};

export default meta;
export const Preview: Story = (args) => <StudioDecimalInput {...args}></StudioDecimalInput>;

Preview.args = {
  description: 'This is a decimal input',
  value: 2.3,
  label: 'Decimal input',
  validationErrorMessage: 'Your custom error message!',
};
