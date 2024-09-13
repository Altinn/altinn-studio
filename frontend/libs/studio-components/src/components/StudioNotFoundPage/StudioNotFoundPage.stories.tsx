import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioNotFoundPage } from './StudioNotFoundPage';

type Story = StoryFn<typeof StudioNotFoundPage>;

const meta: Meta = {
  title: 'StudioNotFoundPage',
  component: StudioNotFoundPage,
};
export const Preview: Story = (args): React.ReactElement => <StudioNotFoundPage {...args} />;
export default meta;
