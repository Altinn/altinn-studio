import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioTextarea } from './StudioTextarea';

type Story = StoryFn<typeof StudioTextarea>;

const meta: Meta = {
  title: 'Components/StudioTextarea',
  component: StudioTextarea,
  argTypes: {
    required: {
      control: 'boolean',
    },
  },
};
export const Preview: Story = (args) => {
  const computedTagText = args.required ? 'Må fylles ut' : 'Valgfritt';

  return <StudioTextarea {...args} tagText={computedTagText}></StudioTextarea>;
};

Preview.args = {
  label: 'Textarea komponent',
  description: 'Beskrivelse',
  error: '',
  required: false,
  rows: 4,
};

export default meta;
