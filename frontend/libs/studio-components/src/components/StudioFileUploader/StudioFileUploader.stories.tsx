import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioFileUploader } from './';

type Story = StoryFn<typeof StudioFileUploader>;

const meta: Meta = {
  title: 'Components/StudioFileUploader',
  component: StudioFileUploader,
  argTypes: {
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

export const Preview: Story = (args): ReactElement => <StudioFileUploader {...args} />;

Preview.args = {
  uploaderButtonText: 'Last opp fil',
  variant: 'tertiary',
  onSubmit: () => {},
  disabled: false,
};

export default meta;
