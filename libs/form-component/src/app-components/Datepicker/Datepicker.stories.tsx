import { useState } from 'react';
import type { MonthCaptionProps } from 'react-day-picker';

import type { Meta, StoryObj } from '@storybook/react-vite';

import 'react-day-picker/style.css';

import { DatePickerControl } from './Datepicker';

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
  return <DatePickerControl {...args} value={value} onValueChange={setValue} />;
};

export const Preview: Story = {
  args: {
    id: 'datepicker-preview',
    value: '2025-03-15',
    dateFormat: 'dd.MM.yyyy',
    locale: 'nb',
    buttonAriaLabel: 'Open date picker',
    calendarIconTitle: 'Calendar',
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
