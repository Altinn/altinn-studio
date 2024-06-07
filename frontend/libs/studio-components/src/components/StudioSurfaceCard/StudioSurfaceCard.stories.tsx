import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioSurfaceCard } from './StudioSurfaceCard';

type Story = StoryFn<typeof StudioSurfaceCard>;

const meta: Meta = {
  title: 'Studio/StudioSurfaceCard',
  component: StudioSurfaceCard,
  argTypes: {},
};
export const Preview: Story = (args): React.ReactElement => (
  <StudioSurfaceCard {...args}>{args.children}</StudioSurfaceCard>
);

Preview.args = {
  title: 'hello',
  children: <div>hello</div>,
};
export default meta;
