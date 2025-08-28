import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioLinkButton } from './StudioLinkButton';
import { PencilIcon } from '@studio/icons';

type Story = StoryFn<typeof StudioLinkButton>;

const meta: Meta = {
  title: 'Components/StudioLinkButton',
  component: StudioLinkButton,
  argTypes: {
    iconPlacement: {
      control: 'radio',
      options: ['left', 'right'],
    },
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    'data-color': {
      control: 'radio',
      options: ['neutral', 'info', 'danger', 'success', 'warning'],
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
  },
};
export const Preview: Story = (args): ReactElement => <StudioLinkButton {...args} />;

Preview.args = {
  children: 'Text',
  iconPlacement: 'left',
  href: 'https://designsystemet.no/',
  icon: <PencilIcon />,
  'data-size': 'sm',
  'data-color': 'info',
  // variant: 'primary',
};
export default meta;
