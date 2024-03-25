import type { Meta, StoryFn } from '@storybook/react';
import { StudioBooleanToggleGroup } from './StudioBooleanToggleGroup';
import React from 'react';

type Story = StoryFn<typeof StudioBooleanToggleGroup>;

// Define your component meta
const meta: Meta = {
  title: 'Forms/StudioBooleanToggleGroup',
  component: StudioBooleanToggleGroup,
  parameters: {
    layout: 'centered', // Optional parameter to center the component in the Canvas.
  },
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
