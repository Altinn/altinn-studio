import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioTextfield } from './StudioTextfield';

type Story = StoryFn<typeof StudioTextfield>;

const meta: Meta = {
  title: 'Components/StudioTextfield',
  component: StudioTextfield,
  argTypes: {
    required: {
      control: 'boolean',
    },
  },
};
export const Preview: Story = (args) => <StudioTextfield {...args}></StudioTextfield>;

Preview.args = {
  label: 'Textfield',
  description: '',
  error: '',
  required: false,
  tagText: 'Må fylles ut',
};

export default meta;
