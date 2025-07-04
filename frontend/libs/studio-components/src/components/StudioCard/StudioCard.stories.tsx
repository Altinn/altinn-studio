import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioCard } from './StudioCard';

type Story = StoryFn<typeof StudioCard>;

const meta: Meta<typeof StudioCard> = {
  title: 'Components/StudioCard',
  component: StudioCard,
};
export const Preview: Story = (args): React.ReactElement => <StudioCard {...args} />;

Preview.args = {
  children: 'Lorem ipsum dolor sit amet.',
};
export default meta;
