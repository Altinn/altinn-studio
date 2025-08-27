import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioFileUploader } from './StudioFileUploader';

type Story = StoryFn<typeof StudioFileUploader>;

const meta: Meta = {
  title: 'Components/StudioFileUploader',
  component: StudioFileUploader,
  argTypes: {
    size: {
      control: 'select',
      options: ['xsmall', 'small', 'medium', 'large'],
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
    disabled: {
      control: 'boolean',
    },
    accept: {
      control: 'text',
      type: 'string',
    },
    onSubmit: {
      table: { disable: true },
    },
  },
};

export const Preview: Story = (args): React.ReactElement => {
  return <StudioFileUploader {...args} />;
};

Preview.args = {
  uploaderButtonText: 'Last opp fil',
  variant: 'tertiary',
  onSubmit: () => {},
  disabled: false,
};
export default meta;
