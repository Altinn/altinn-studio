import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioPopover } from './StudioPopover';

const studioPopoverPlacementOptions: string[] = [
  'top',
  'right',
  'bottom',
  'left',
  'top-start',
  'top-end',
  'right-start',
  'right-end',
  'bottom-start',
  'bottom-end',
  'left-start',
  'left-end',
];
const studioPopoverVariantOptions: string[] = ['default', 'danger', 'info', 'warning'];
const studioPopoverSizeOptions: string[] = ['small', 'medium', 'large'];

type Story = StoryFn<typeof StudioPopover>;

const meta: Meta = {
  title: 'Components/StudioPopover',
  component: StudioPopover,
  argTypes: {
    placement: {
      control: 'select',
      options: studioPopoverPlacementOptions,
    },
    variant: {
      control: 'radio',
      options: studioPopoverVariantOptions,
    },
    size: {
      control: 'select',
      options: studioPopoverSizeOptions,
    },
  },
};

export const Preview: Story = (args): React.ReactElement => {
  return (
    <StudioPopover {...args}>
      <StudioPopover.Trigger>My trigger!</StudioPopover.Trigger>
      <StudioPopover.Content>StudioPopover content</StudioPopover.Content>
    </StudioPopover>
  );
};

Preview.args = {
  placement: 'top',
  variant: 'default',
  size: 'medium',
  onOpenChange: () => {},
};

export default meta;
