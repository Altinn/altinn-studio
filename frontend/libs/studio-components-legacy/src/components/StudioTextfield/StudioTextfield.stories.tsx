import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioTextfield } from './StudioTextfield';

type Story = StoryFn<typeof StudioTextfield>;

const meta: Meta = {
  title: 'Components/StudioTextfield',
  component: StudioTextfield,
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
};
export const Preview: Story = (args) => <StudioTextfield {...args}></StudioTextfield>;

Preview.args = {
  label: 'Textfield',
  placeholder: '',
  error: '',
  size: 'sm',
};

export default meta;
