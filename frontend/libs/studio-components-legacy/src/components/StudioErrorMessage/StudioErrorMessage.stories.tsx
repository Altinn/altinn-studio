import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioErrorMessage } from './StudioErrorMessage';

type Story = StoryFn<typeof StudioErrorMessage>;

const meta: Meta = {
  title: 'Components/StudioErrorMessage',
  component: StudioErrorMessage,
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    children: {
      control: 'text',
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioErrorMessage {...args} />;

Preview.args = {
  children: 'Lorem ipsum dolor sit amet.',
  size: 'sm',
};
export default meta;
