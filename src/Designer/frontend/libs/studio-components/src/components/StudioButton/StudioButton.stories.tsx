import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioButton } from './StudioButton';
import { PencilIcon } from '../../../../studio-icons';

const meta: Meta = {
  title: 'Components/StudioButton',
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

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Text',
    iconPlacement: 'left',
    icon: <PencilIcon />,
  },
};

export const FullWidth: Story = {
  args: {
    ...Preview.args,
    fullWidth: true,
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
