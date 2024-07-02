import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { PencilIcon } from '@studio/icons';
import { StudioIconTextfield } from './StudioIconTextfield';

type Story = StoryFn<typeof StudioIconTextfield>;

const meta: Meta = {
  title: 'Forms/StudioIconTextfield',
  component: StudioIconTextfield,
  argTypes: {
    value: {
      control: 'text',
    },
  },
};

export default meta;
export const Preview: Story = (args) => <StudioIconTextfield {...args}></StudioIconTextfield>;

Preview.args = {
  icon: <PencilIcon />,
  value: 2.3,
  error: 'Your custom error message!',
};
