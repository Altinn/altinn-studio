import React, { useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioInlineTextField } from './StudioInlineTextField';

const meta = {
  title: 'Components/StudioInlineTextField',
  component: StudioInlineTextField,
  decorators: [
    (StoryComponent): ReactElement => (
      <div style={{ width: '400px' }}>
        <StoryComponent />
      </div>
    ),
  ],
} satisfies Meta<typeof StudioInlineTextField>;
export default meta;

type Story = StoryObj<typeof StudioInlineTextField>;

export const Preview: Story = {
  render: (args): ReactElement => {
    const [value, setValue] = useState(args.value ?? '');

    return (
      <StudioInlineTextField
        {...args}
        value={value}
        onChange={(newValue: string) => setValue(newValue)}
      />
    );
  },

  args: {
    label: 'Inline text field',
    description: 'Edit this value inline.',
    value: '',
    required: false,
    tagText: 'Optional',
    saveAriaLabel: 'Save',
    cancelAriaLabel: 'Cancel',
  },
};
