import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTextfield } from './StudioTextfield';

type Story = StoryFn<typeof StudioTextfield>;

const meta: Meta = {
  title: 'Components/StudioTextfield',
  component: StudioTextfield,
  argTypes: {
    multiline: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
    showRequiredText: {
      control: 'boolean',
    },
  },
};
export const Preview: Story = (args) => <StudioTextfield {...args}></StudioTextfield>;

Preview.args = {
  label: 'Textfield',
  description: '',
  error: '',
  multiline: false,
  required: false,
  requiredText: 'Må fylles ut',
  showRequiredText: true,
};

export default meta;
