import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { KeyVerticalIcon } from '@studio/icons';
import { StudioIconTextfield } from './StudioIconTextfield';

type Story = StoryFn<typeof StudioIconTextfield>;

const meta: Meta = {
  title: 'Components/StudioIconTextfield',
  component: StudioIconTextfield,
  parameters: {
    docs: {
      canvas: {
        height: '100%',
      },
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

export const AsReadOnly: Story = (args) => <StudioIconTextfield {...args} />;
AsReadOnly.args = {
  label: 'A label',
  value: 'A readonly value',
  readOnly: true,
};

export const AsReadOnlyWithIcon: Story = (args) => <StudioIconTextfield {...args} />;
AsReadOnlyWithIcon.args = {
  icon: <KeyVerticalIcon />,
  label: 'A label',
  value: 'A readonly value',
  readOnly: true,
};

export const AsReadOnlyWithIconAndDescription: Story = (args) => <StudioIconTextfield {...args} />;
AsReadOnlyWithIconAndDescription.args = {
  icon: <KeyVerticalIcon />,
  description: 'A description',
  label: 'A label',
  value: 'A readonly value',
  readOnly: true,
};
