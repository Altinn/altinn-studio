import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioTextarea } from './StudioTextarea';

type Story = StoryFn<typeof StudioTextarea>;

const meta: Meta = {
  title: 'Forms/StudioTextarea',
  component: StudioTextarea,
  argTypes: {
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioTextarea {...args} />;

Preview.args = {
  label: 'My awesome label',
  placeholder: 'Type something here...',
  error: '',
  hideLabel: false,
  size: 'medium',
};
export default meta;
