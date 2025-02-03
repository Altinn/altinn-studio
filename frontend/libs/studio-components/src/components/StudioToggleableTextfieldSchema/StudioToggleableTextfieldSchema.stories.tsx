import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
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
  viewProps: {
    value: 'My awesome value',
  },
  inputProps: {
    label: 'My awesome label',
    size: 'small',
    placeholder: 'Placeholder',
    error: '',
  },
};

export default meta;
