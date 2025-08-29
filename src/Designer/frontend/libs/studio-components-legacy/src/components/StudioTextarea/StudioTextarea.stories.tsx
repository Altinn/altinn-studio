import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioTextarea } from './StudioTextarea';

type Story = StoryFn<typeof StudioTextarea>;

const meta: Meta = {
  title: 'Components/StudioTextarea',
  component: StudioTextarea,
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioTextarea {...args} />;

Preview.args = {
  label: 'My awesome label',
  placeholder: 'Type something here...',
  error: '',
  hideLabel: false,
  size: 'sm',
};
export default meta;
