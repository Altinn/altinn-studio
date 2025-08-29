import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioActionCloseButton } from './StudioActionCloseButton';
import { action } from 'storybook/actions';

type Story = StoryFn<typeof StudioActionCloseButton>;

const meta: Meta = {
  title: 'Components/StudioActionCloseButton',
  component: StudioActionCloseButton,
};

export const Preview: Story = (args): React.ReactElement => <StudioActionCloseButton {...args} />;

Preview.args = {
  onClick: action('onClick'),
  variant: 'secondary',
};

export default meta;
