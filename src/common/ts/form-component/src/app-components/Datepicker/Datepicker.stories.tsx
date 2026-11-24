import type { MonthCaptionProps } from 'react-day-picker';

import { renderWithImmediateArgs } from '@app/storybook/renderWithImmediateArgs';
import { fn } from 'storybook/test';
import type { StoryArgsProps } from '@app/storybook/renderWithImmediateArgs';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DatePickerControl } from './Datepicker';
import type { DatePickerControlProps } from './Datepicker';

import 'react-day-picker/style.css';

const NoopDropdownCaption = ({ calendarMonth }: MonthCaptionProps) => (
  <div style={{ padding: 8, fontWeight: 600 }}>
    {calendarMonth.date.toLocaleString('en', { month: 'long', year: 'numeric' })}
  </div>
);

const Wrapper = ({ args, updateArgs }: StoryArgsProps<DatePickerControlProps>) => (
  <DatePickerControl
    {...args}
    onValueChange={(value) => {
      args.onValueChange(value);
      updateArgs({ value });
    }}
  />
);

const meta = {
  title: 'AppComponents/DatePickerControl',
  component: DatePickerControl,
  render: renderWithImmediateArgs(Wrapper),
} satisfies Meta<typeof DatePickerControl>;

export default meta;

type Story = StoryObj<typeof meta>;

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
};

export const ReadOnly: Story = {
  args: {
    ...Preview.args,
    readOnly: true,
  },
};

export const WithMinMax: Story = {
  args: {
    ...Preview.args,
    minDate: new Date('2025-01-01'),
    maxDate: new Date('2025-12-31'),
  },
};
