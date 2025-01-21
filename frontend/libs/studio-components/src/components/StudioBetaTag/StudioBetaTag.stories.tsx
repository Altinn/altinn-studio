import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioBetaTag } from './StudioBetaTag';

type Story = StoryFn<typeof StudioBetaTag>;

const meta: Meta = {
  title: 'Components/StudioBetaTag',
  component: StudioBetaTag,
};

export const Preview: Story = (): React.ReactElement => <StudioBetaTag />;

export default meta;
