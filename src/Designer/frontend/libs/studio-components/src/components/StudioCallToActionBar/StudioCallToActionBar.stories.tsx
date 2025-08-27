import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { StudioCallToActionBar } from './index';

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
