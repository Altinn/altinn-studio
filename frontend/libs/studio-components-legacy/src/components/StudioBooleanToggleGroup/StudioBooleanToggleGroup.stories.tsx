import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioBooleanToggleGroup } from './StudioBooleanToggleGroup';

type Story = StoryFn<typeof StudioBooleanToggleGroup>;

const meta: Meta = {
  title: 'Components/StudioBooleanToggleGroup',
  component: StudioBooleanToggleGroup,
};

export default meta;
export const Preview: Story = (args) => (
  <StudioBooleanToggleGroup {...args}></StudioBooleanToggleGroup>
);

Preview.args = {
  value: false,
  trueLabel: 'Yes',
  falseLabel: 'No',
};
