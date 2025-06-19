import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioAnimateHeight } from './StudioAnimateHeight';

type Story = StoryFn<typeof StudioAnimateHeight>;

const meta: Meta = {
  title: 'Components/StudioAnimateHeight',
  component: StudioAnimateHeight,
};
export const Preview: Story = (args): React.ReactElement => <StudioAnimateHeight {...args} />;

Preview.args = {
  children: 'Change the open prop to see the animation in action',
  open: true,
};
export default meta;
