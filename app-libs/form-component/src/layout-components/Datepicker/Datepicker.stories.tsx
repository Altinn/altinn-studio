import { useState } from 'react';

import { fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Datepicker } from './Datepicker';

const meta = {
  title: 'LayoutComponents/Datepicker',
  component: Datepicker,
  parameters: {
    layout: 'padded',
  },
  args: {
    id: 'datepicker-preview',
    value: '2025-03-15',
    format: 'dd.MM.yyyy',
    onValueChange: fn(),
  },
} satisfies Meta<typeof Datepicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const Wrapper = (args: React.ComponentProps<typeof Datepicker>) => {
  const [value, setValue] = useState(args.value);
  const handleValueChange = (newValue: string) => {
    args.onValueChange(newValue);
    setValue(newValue);
  };
  return <Datepicker {...args} value={value} onValueChange={handleValueChange} />;
};

export const Preview: Story = {
  render: (args) => <Wrapper {...args} />,
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
  render: (args) => <Wrapper {...args} />,
};

export const WithMinMax: Story = {
  args: {
    minDate: '2025-01-01',
    maxDate: '2025-12-31',
  },
  render: (args) => <Wrapper {...args} />,
};
