import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { StudioHoverCallToAction } from './';

type Story = StoryFn<typeof StudioHoverCallToAction>;

const meta: Meta = {
  title: 'Components/StudioHoverCallToAction',
  component: StudioHoverCallToAction,
};
export const Preview: Story = (args): ReactElement => (
  <StudioHoverCallToAction {...args}>{args.children}</StudioHoverCallToAction>
);

Preview.args = {
  children: 'Please hover me to see the result!',
  onClick: action('Action button is clicked'),
  isVisible: false,
  title: 'My awesome action',
};
export default meta;
