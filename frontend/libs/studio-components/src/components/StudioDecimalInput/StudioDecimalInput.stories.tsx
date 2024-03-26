import type { Meta, StoryFn } from '@storybook/react';
import { StudioDecimalInput } from './StudioDecimalInput';
import React from 'react';

type Story = StoryFn<typeof StudioDecimalInput>;

// Define your component meta
const meta: Meta = {
  title: 'Forms/StudioDecimalInput',
  component: StudioDecimalInput,
  parameters: {
    layout: 'centered', // Optional parameter to center the component in the Canvas.
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
