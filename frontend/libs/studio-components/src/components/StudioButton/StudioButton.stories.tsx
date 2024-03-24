import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioButton } from './StudioButton';

type Story = StoryFn<typeof StudioButton>;

// Define your component meta
const meta: Meta = {
  title: 'Studio/StudioButton',
  component: StudioButton,
  parameters: {
    layout: 'centered', // Optional parameter to center the component in the Canvas.
  },
};

export default meta;
export const Preview: Story = (args) => <StudioButton {...args}></StudioButton>;

Preview.args = {
  children: 'Text',
  iconPlacement: 'left',
  icon: null,
};

Preview.argTypes = {
  icon: {
    control: {
      type: 'select',
      options: [null, 'hello'],
    },
  },
};
