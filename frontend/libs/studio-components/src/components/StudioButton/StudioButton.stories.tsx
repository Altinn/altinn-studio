import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioButton } from './StudioButton';
import { PencilIcon } from '@studio/icons';

type Story = StoryFn<typeof StudioButton>;

const meta: Meta = {
  title: 'StudioButton',
  component: StudioButton,
  argTypes: {
    iconPlacement: {
      control: 'radio',
      options: ['left', 'right'],
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioButton {...args} />;

Preview.args = {
  children: 'Text',
  iconPlacement: 'left',
  icon: <PencilIcon />,
};
export default meta;
