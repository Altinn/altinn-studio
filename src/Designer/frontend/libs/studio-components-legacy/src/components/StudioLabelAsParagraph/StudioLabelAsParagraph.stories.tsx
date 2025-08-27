import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioLabelAsParagraph } from './StudioLabelAsParagraph';

type Story = StoryFn<typeof StudioLabelAsParagraph>;

const meta: Meta = {
  title: 'Components/StudioLabelAsParagraph',
  component: StudioLabelAsParagraph,
  argTypes: {
    spacing: {
      control: 'boolean',
    },
    size: {
      control: 'radio',
      options: ['xsmall', 'small', 'medium', 'large'],
    },
    weight: {
      control: 'radio',
      options: ['medium', 'regular', 'semibold'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioLabelAsParagraph {...args} />;

Preview.args = {
  children: 'Paragraph in bold',
  size: 'medium',
};
export default meta;
