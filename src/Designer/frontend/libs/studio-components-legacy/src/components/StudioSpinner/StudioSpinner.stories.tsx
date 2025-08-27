import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioSpinner } from './StudioSpinner';

type Story = StoryFn<typeof StudioSpinner>;

const meta: Meta = {
  title: 'Components/StudioSpinner',
  component: StudioSpinner,
  argTypes: {
    size: {
      control: 'radio',
      options: ['small', 'medium', 'large'],
    },
    variant: {
      control: 'radio',
      options: ['default', 'interaction', 'inverted'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioSpinner {...args} />;

Preview.args = {
  spinnerTitle: 'Text',
  showSpinnerTitle: false,
  size: 'medium',
  variant: 'interaction',
};
export default meta;
