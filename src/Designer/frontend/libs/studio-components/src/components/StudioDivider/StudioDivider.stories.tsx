import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDivider } from './StudioDivider';

const meta: Meta = {
  title: 'Components/StudioDivider',
  component: StudioDivider,
};

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: () => (
    <div>
      <p>Content above divider</p>
      <StudioDivider />
      <p>Content below divider</p>
    </div>
  ),
};

export default meta;
