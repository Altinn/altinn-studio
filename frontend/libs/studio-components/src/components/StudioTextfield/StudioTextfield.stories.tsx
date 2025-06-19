import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
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
  },
};
export const Preview: Story = (args) => <StudioTextfield {...args}></StudioTextfield>;

Preview.args = {
  label: 'Textfield',
  description: '',
  error: '',
  multiline: false,
  required: false,
  tagText: 'Må fylles ut',
};

export default meta;
