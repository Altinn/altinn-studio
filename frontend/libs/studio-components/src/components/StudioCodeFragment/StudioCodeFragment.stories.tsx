import type { Meta, StoryFn } from '@storybook/react';
import { StudioCodeFragment } from './StudioCodeFragment';
import React from 'react';

type Story = StoryFn<typeof StudioCodeFragment>;

// Define your component meta
const meta: Meta = {
  title: 'Studio/StudioCodeFragment',
  component: StudioCodeFragment,
  parameters: {
    layout: 'centered', // Optional parameter to center the component in the Canvas.
  },
};

export default meta;
export const Preview: Story = (args) => <StudioCodeFragment {...args}></StudioCodeFragment>;

Preview.args = {
  children: 'Please use the h1-tag like this: <h1>This is the main title</h1>',
};
