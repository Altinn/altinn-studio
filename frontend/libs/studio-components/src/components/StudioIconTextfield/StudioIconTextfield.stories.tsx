import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { KeyVerticalIcon } from '@studio/icons';
import { StudioIconTextfield } from './StudioIconTextfield';

type Story = StoryFn<typeof StudioIconTextfield>;

const meta: Meta = {
  title: 'Components/StudioIconTextfield',
  component: StudioIconTextfield,
  argTypes: {
    value: {
      control: 'text',
    },
  },
};

export default meta;
export const WithIcon: Story = (args) => <StudioIconTextfield {...args} />;
WithIcon.args = {
  icon: <KeyVerticalIcon />,
  label: 'A label',
  value: 'A value',
};

export const WithoutIcon: Story = (args) => <StudioIconTextfield {...args} />;
WithoutIcon.args = {
  label: 'A label',
  value: 'A value',
};

export const WithErrorMessage: Story = (args) => <StudioIconTextfield {...args} />;
WithErrorMessage.args = {
  label: 'A label',
  value: 'A faulty value',
  error: 'Your custom error message!',
};
