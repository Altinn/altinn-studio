import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioToggleableTextfield } from './StudioToggleableTextfield';
import { KeyVerticalIcon } from '@studio/icons';

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
  viewProps: {
    variant: 'tertiary',
    size: 'small',
    label: 'My awesome label',
    children: 'My awesome value',
  },
  inputProps: {
    icon: <KeyVerticalIcon />,
    label: 'My awesome label',
    size: 'small',
    placeholder: 'Placeholder',
    error: '',
  },
};

export default meta;
