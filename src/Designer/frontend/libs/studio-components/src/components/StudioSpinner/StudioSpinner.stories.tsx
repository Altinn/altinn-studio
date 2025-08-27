import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioSpinner } from './StudioSpinner';

type Story = StoryFn<typeof StudioSpinner>;

const meta: Meta = {
  title: 'Components/StudioSpinner',
  component: StudioSpinner,
  argTypes: {
    'data-size': {
      control: 'radio',
      options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};
export const Preview: Story = (args): ReactElement => <StudioSpinner {...args} />;

Preview.args = {
  'aria-label': 'Loading',
  'data-size': 'sm',
};
export default meta;
