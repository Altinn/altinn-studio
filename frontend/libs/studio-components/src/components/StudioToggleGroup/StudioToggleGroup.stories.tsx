import type { Meta, StoryObj } from '@storybook/react';
import { StudioToggleGroup } from './';
import React from 'react';

type Story = StoryObj<typeof StudioToggleGroup>;

const meta: Meta<typeof StudioToggleGroup> = {
  title: 'Components/StudioToggleGroup',
  component: StudioToggleGroup,
};
export default meta;

export const Preview: Story = {
  args: {
    defaultValue: '1',
    children: (
      <>
        <StudioToggleGroup.Item value='1'>First</StudioToggleGroup.Item>
        <StudioToggleGroup.Item value='2'>Second</StudioToggleGroup.Item>
        <StudioToggleGroup.Item value='3'>Third</StudioToggleGroup.Item>
      </>
    ),
  },
};
