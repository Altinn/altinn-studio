import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioPageError } from './StudioPageError';

type Story = StoryFn<typeof StudioPageError>;

const meta: Meta = {
  title: 'Studio/StudioPageError',
  component: StudioPageError,
};
export const Preview: Story = (args): React.ReactElement => <StudioPageError {...args} />;
export default meta;
