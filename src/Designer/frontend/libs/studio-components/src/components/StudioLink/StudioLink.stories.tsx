import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioLink } from './StudioLink';
import { PencilIcon } from '../../../../studio-icons';

type Story = StoryFn<typeof StudioLink>;

const meta: Meta = {
  title: 'Components/StudioLink',
  component: StudioLink,
  argTypes: {
    iconPlacement: {
      control: 'radio',
      options: ['left', 'right'],
    },
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
};
export const Preview: Story = (args): ReactElement => <StudioLink {...args} />;

Preview.args = {
  children: 'Text',
  iconPlacement: 'left',
  href: 'https://designsystemet.no/',
  icon: <PencilIcon />,
  'data-size': 'sm',
};
export default meta;
