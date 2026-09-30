import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextArea } from './TextArea';

const meta = {
  title: 'AppComponents/TextArea',
  component: TextArea,
  args: {
    onChange: () => {},
  },
} satisfies Meta<typeof TextArea>;

export default meta;

type Story = StoryObj<typeof meta>;

const Wrapper = (args: React.ComponentProps<typeof TextArea>) => {
  const [value, setValue] = useState(args.value);
  return <TextArea {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  args: {
    id: 'textarea-default',
    value: 'Some text content',
  },
  render: (args) => <Wrapper {...args} />,
};

export const WithCharacterLimit: Story = {
  args: {
    id: 'textarea-character-limit',
    value: 'Counted text',
    characterLimit: {
      limit: 100,
      under: '%d characters remaining',
      over: '%d characters too many',
    },
  },
  render: (args) => <Wrapper {...args} />,
};

export const ReadOnly: Story = {
  args: {
    id: 'textarea-read-only',
    value: 'This text cannot be edited',
    readOnly: true,
  },
  render: (args) => <Wrapper {...args} />,
};
