import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioActionCloseButton } from './StudioActionCloseButton';
import { fn } from '@storybook/test';

type Story = StoryFn<typeof StudioActionCloseButton>;

const meta: Meta = {
  title: 'Components/StudioActionCloseButton',
  component: StudioActionCloseButton,
};
export const Preview: Story = (args): React.ReactElement => <StudioActionCloseButton {...args} />;

Preview.args = {
  onClick: fn(),
};

export default meta;
