import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioBanner } from './';
import { StudioButton } from '../StudioButton';
import { StudioSwitch } from '../StudioSwitch';

const meta: Meta<typeof StudioBanner> = {
  title: 'Components/StudioBanner',
  component: StudioBanner,
};

type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  args: {
    title: 'Simple Banner',
    description: 'This is a simple banner with just a title and description.',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Banner with Actions',
    description: 'This banner includes action buttons at the bottom.',
    actions: (
      <>
        <StudioButton variant='secondary'>Cancel</StudioButton>
        <StudioButton variant='primary'>Accept</StudioButton>
      </>
    ),
  },
};

export const WithChildren: Story = {
  args: {
    title: 'Banner with Content',
    description: 'This banner contains custom content like switches.',
    children: (
      <>
        <StudioSwitch checked={true} onChange={() => {}} label='Enable analytics' />
        <StudioSwitch checked={false} onChange={() => {}} label='Enable session recording' />
      </>
    ),
    actions: (
      <>
        <StudioButton variant='secondary'>Decline All</StudioButton>
        <StudioButton variant='primary'>Save Preferences</StudioButton>
      </>
    ),
  },
};

export const Hidden: Story = {
  args: {
    title: 'Hidden Banner',
    description: 'This banner is hidden because isVisible is set to false.',
    isVisible: false,
  },
};

export default meta;
