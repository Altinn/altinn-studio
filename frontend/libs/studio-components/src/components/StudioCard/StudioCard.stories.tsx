import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import type { StudioCardProps } from './StudioCard';
import { StudioCard } from './StudioCard';

type Story = StoryFn<typeof StudioCard>;

const meta: Meta = {
  title: 'Components/StudioCard',
  component: StudioCard,
};
export const Preview: Story = (args: StudioCardProps): React.ReactElement => (
  <StudioCard {...args} />
);

Preview.args = {
  children: 'Lorem ipsum dolor sit amet.',
};
export default meta;
