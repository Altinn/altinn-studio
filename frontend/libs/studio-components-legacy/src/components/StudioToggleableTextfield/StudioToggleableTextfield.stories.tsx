import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioToggleableTextfield } from './StudioToggleableTextfield';

type Story = StoryFn<typeof StudioToggleableTextfield>;

const meta: Meta = {
  title: 'Components/StudioToggleableTextfield',
  component: StudioToggleableTextfield,
};

export const Preview: Story = (args) => (
  <StudioToggleableTextfield {...args}></StudioToggleableTextfield>
);

Preview.args = {
  onIsViewMode: () => {},
  label: 'My awesome label',
  value: 'value',
  error: 'error',
};

export default meta;
