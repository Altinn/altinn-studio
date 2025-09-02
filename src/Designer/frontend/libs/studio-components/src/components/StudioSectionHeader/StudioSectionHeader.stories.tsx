import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioSectionHeader } from './StudioSectionHeader';
import { PencilIcon } from '@studio/icons';

type Story = StoryFn<typeof StudioSectionHeader>;

const meta: Meta = {
  title: 'Components/StudioSectionHeader',
  component: StudioSectionHeader,
  argTypes: {
    icon: {
      control: false,
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioSectionHeader {...args} />;

Preview.args = {
  icon: <PencilIcon />,
  heading: {
    text: 'Heading',
    level: 2,
  },
  helpText: {
    text: 'My descriptive help text goes here!',
    title: 'Help text title',
  },
};
export default meta;
