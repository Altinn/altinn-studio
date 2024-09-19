import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioPageSpinner } from './StudioPageSpinner';

type Story = StoryFn<typeof StudioPageSpinner>;

const meta: Meta = {
  title: 'StudioPageSpinner',
  component: StudioPageSpinner,
};
export const Preview: Story = (args): React.ReactElement => <StudioPageSpinner {...args} />;

Preview.args = {
  spinnerTitle: 'Loading user profile',
  showSpinnerTitle: true,
};
export default meta;
