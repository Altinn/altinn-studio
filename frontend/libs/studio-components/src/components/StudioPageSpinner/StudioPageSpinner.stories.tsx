import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioPageSpinner } from './StudioPageSpinner';

type Story = StoryFn<typeof StudioPageSpinner>;

const meta: Meta = {
  title: 'Components/StudioPageSpinner',
  component: StudioPageSpinner,
};
export const Preview: Story = (args): ReactElement => <StudioPageSpinner {...args} />;

Preview.args = {
  spinnerTitle: 'Loading user profile',
  showSpinnerTitle: true,
};
export default meta;
