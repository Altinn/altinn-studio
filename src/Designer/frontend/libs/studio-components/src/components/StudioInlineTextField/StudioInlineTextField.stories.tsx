import React, { useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioInlineTextField } from './StudioInlineTextField';

type Story = StoryFn<typeof StudioInlineTextField>;

const meta: Meta = {
  title: 'Components/StudioInlineTextField',
  component: StudioInlineTextField,
  decorators: [
    (StoryComponent): ReactElement => (
      <div style={{ width: '400px' }}>
        <StoryComponent />
      </div>
    ),
  ],
};

export const Preview: Story = (args): ReactElement => {
  const [value, setValue] = useState(args.value ?? '');

  return (
    <StudioInlineTextField
      {...args}
      value={value}
      onChange={(newValue: string) => setValue(newValue)}
    />
  );
};

Preview.args = {
  label: 'Inline text field',
  description: 'Edit this value inline.',
  value: '',
  required: false,
  tagText: 'Optional',
  saveAriaLabel: 'Save',
  cancelAriaLabel: 'Cancel',
};

export default meta;
