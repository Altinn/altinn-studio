import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioToggleableTextfieldSchema } from './StudioToggleableTextfieldSchema';

type Story = StoryFn<typeof StudioToggleableTextfieldSchema>;

const meta: Meta = {
  title: 'Components/StudioToggleableTextfieldSchema',
  component: StudioToggleableTextfieldSchema,
};

export const Preview: Story = (args) => (
  <StudioToggleableTextfieldSchema {...args}></StudioToggleableTextfieldSchema>
);

Preview.args = {
  label: 'My awesome label',
  value: 'value',
  error: '',
};

export default meta;
