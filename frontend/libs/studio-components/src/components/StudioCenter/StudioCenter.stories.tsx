import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioCenter } from './StudioCenter';

type Story = StoryFn<typeof StudioCenter>;

const meta: Meta = {
  title: 'Components/StudioCenter',
  component: StudioCenter,
};
export const Preview: Story = (args): React.ReactElement => <StudioCenter {...args} />;

Preview.args = {
  children: 'This text is centered vertically and horizontally',
};
export default meta;
