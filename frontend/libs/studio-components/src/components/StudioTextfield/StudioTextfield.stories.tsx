import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTextfield } from './StudioTextfield';

type Story = StoryFn<typeof StudioTextfield>;

const meta: Meta = {
  title: 'Forms/StudioTextfield',
  component: StudioTextfield,
  argTypes: {
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
    },
  },
};
export const Preview: Story = (args) => <StudioTextfield {...args}></StudioTextfield>;

Preview.args = {
  label: 'Textfield',
  placeholder: '',
  error: '',
  size: 'small',
};

export default meta;
