import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { StudioCallToActionBar } from '.';

type Story = StoryFn<typeof StudioCallToActionBar>;

const meta: Meta = {
  title: 'Components/StudioCallToActionBar',
  component: StudioCallToActionBar,
};
export const Preview: Story = (args): ReactElement => (
  <StudioCallToActionBar {...args}>{args.children}</StudioCallToActionBar>
);

Preview.args = {
  children: 'The blue bar below with the add button is the component',
  onClick: action('Action button is clicked'),
  isVisible: false,
  title: 'My awesome action',
};
export default meta;
