import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioDisplayTile } from './StudioDisplayTile';
import { PencilIcon } from '@studio/icons';

type Story = StoryFn<typeof StudioDisplayTile>;

const meta: Meta = {
  title: 'Components/StudioDisplayTile',
  component: StudioDisplayTile,
};
export const Preview: Story = (args): React.ReactElement => <StudioDisplayTile {...args} />;

Preview.args = {
  label: 'Label',
  value: 'Value',
  icon: <PencilIcon />,
};
export default meta;
