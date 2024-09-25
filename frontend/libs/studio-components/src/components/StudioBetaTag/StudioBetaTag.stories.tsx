import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioBetaTag } from './StudioBetaTag';

type Story = StoryFn<typeof StudioBetaTag>;

const meta: Meta = {
  title: 'Components/StudioBetaTag',
  component: StudioBetaTag,
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export const Preview: Story = (args): React.ReactElement => <StudioBetaTag {...args} />;

Preview.args = {
  size: 'sm',
};

export default meta;
