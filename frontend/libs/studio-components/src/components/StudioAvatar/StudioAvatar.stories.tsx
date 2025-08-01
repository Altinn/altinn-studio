import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioAvatar } from './StudioAvatar';

type Story = StoryFn<typeof StudioAvatar>;

const meta: Meta = {
  title: 'Components/StudioAvatar',
  component: StudioAvatar,
};
export const Preview: Story = (args): ReactElement => <StudioAvatar {...args} />;

export default meta;
