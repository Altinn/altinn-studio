import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioDeleteButton } from './StudioDeleteButton';

type Story = StoryFn<typeof StudioDeleteButton>;

const meta: Meta = {
  title: 'StudioDeleteButton',
  component: StudioDeleteButton,
};
export const Preview: Story = (args): React.ReactElement => <StudioDeleteButton {...args} />;

Preview.args = {
  confirmMessage: 'Are you sure you want to delete this item?',
};
export default meta;
