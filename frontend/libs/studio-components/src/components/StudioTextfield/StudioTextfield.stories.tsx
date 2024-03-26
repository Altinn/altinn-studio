import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTextfield } from './StudioTextfield';

type Story = StoryFn<typeof StudioTextfield>;

// Define your component meta
const meta: Meta = {
  title: 'Forms/StudioTextfield',
  component: StudioTextfield,
  parameters: {
    layout: 'centered', // Optional parameter to center the component in the Canvas.
  },
};

export default meta;
export const Preview: Story = (args) => <StudioTextfield {...args}></StudioTextfield>;

Preview.args = {
  size: 'small',
  label: 'Textfield',
  placeholder: '',
  error: '',
};
