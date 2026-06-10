import { useState } from 'react';
import type { MonthCaptionProps } from 'react-day-picker';

import { fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DatePickerControl } from './Datepicker';

import 'react-day-picker/style.css';

const NoopDropdownCaption = ({ calendarMonth }: MonthCaptionProps) => (
  <div style={{ padding: 8, fontWeight: 600 }}>
    {calendarMonth.date.toLocaleString('en', { month: 'long', year: 'numeric' })}
  </div>
);

const meta = {
  title: 'AppComponents/DatePickerControl',
  component: DatePickerControl,
} satisfies Meta<typeof DatePickerControl>;

export default meta;

type Story = StoryObj<typeof meta>;

const Wrapper = (args: React.ComponentProps<typeof DatePickerControl>) => {
  const [value, setValue] = useState(args.value);
  const handleValueChange = (newValue: string) => {
    args.onValueChange(newValue);
    setValue(newValue);
  };
  return <DatePickerControl {...args} value={value} onValueChange={handleValueChange} />;
};

export const Preview: Story = {
  args: {
    id: 'datepicker-preview',
    value: '2025-03-15',
    dateFormat: 'dd.MM.yyyy',
    locale: 'nb',
    buttonAriaLabel: 'Open date picker',
    calendarIconTitle: 'Calendar',
    onValueChange: fn(),
    DropdownCaption: NoopDropdownCaption,
  },
  render: (args) => <Wrapper {...args} />,
};

export const ReadOnly: Story = {
  args: {
    ...Preview.args,
    readOnly: true,
  },
  render: (args) => <Wrapper {...args} />,
};

export const WithMinMax: Story = {
  args: {
    ...Preview.args,
    minDate: new Date('2025-01-01'),
    maxDate: new Date('2025-12-31'),
  },
  render: (args) => <Wrapper {...args} />,
};
