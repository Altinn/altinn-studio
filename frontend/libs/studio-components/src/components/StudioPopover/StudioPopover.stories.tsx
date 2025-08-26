import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioPopover } from './';

type Story = StoryFn<typeof StudioPopover>;

const meta: Meta = {
  title: 'Components/StudioPopover',
  component: StudioPopover,
  argTypes: {
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
};
export const Preview: Story = (args): ReactElement => (
  <StudioPopover.TriggerContext>
    <StudioPopover.Trigger>Trigger</StudioPopover.Trigger>
    <StudioPopover {...args}>Content</StudioPopover>
  </StudioPopover.TriggerContext>
);

Preview.args = {
  'data-size': 'sm',
};
export default meta;
