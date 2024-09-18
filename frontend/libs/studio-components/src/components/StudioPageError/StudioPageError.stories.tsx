import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioPageError } from './StudioPageError';

type Story = StoryFn<typeof StudioPageError>;

const meta: Meta = {
  title: 'StudioPageError',
  component: StudioPageError,
};
export const Preview: Story = (args): React.ReactElement => {
  return <StudioPageError {...args} />;
};

Preview.args = {
  title: 'Alert title',
  message: 'Alert message',
};
export default meta;
