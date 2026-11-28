import { renderWithImmediateArgs } from '@app/storybook/renderWithImmediateArgs';
import type { StoryArgsProps } from '@app/storybook/renderWithImmediateArgs';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimePicker } from './TimePicker';
import type { TimePickerProps } from './types';

const Wrapper = ({ args, updateArgs }: StoryArgsProps<TimePickerProps>) => (
  <TimePicker {...args} onChange={(value) => updateArgs({ value })} />
);

const meta = {
  title: 'AppComponents/TimePicker',
  component: TimePicker,
  render: renderWithImmediateArgs(Wrapper),
} satisfies Meta<typeof TimePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => undefined;

export const Preview: Story = {
  args: {
    id: 'timepicker-preview',
    value: '14:30',
    format: 'HH:mm',
    onChange: noop,
  },
};

export const TwelveHour: Story = {
  args: {
    id: 'timepicker-12h',
    value: '02:30 PM',
    format: 'hh:mm a',
    onChange: noop,
  },
};

export const WithSeconds: Story = {
  args: {
    id: 'timepicker-seconds',
    value: '14:30:45',
    format: 'HH:mm:ss',
    onChange: noop,
  },
};

export const TwelveHourWithSeconds: Story = {
  args: {
    id: 'timepicker-12h-seconds',
    value: '02:30:45 PM',
    format: 'hh:mm:ss a',
    onChange: noop,
  },
};

export const WithMinMax: Story = {
  args: {
    id: 'timepicker-minmax',
    value: '12:00',
    format: 'HH:mm',
    minTime: '09:00',
    maxTime: '17:00',
    onChange: noop,
  },
};

export const Disabled: Story = {
  args: {
    ...Preview.args,
    disabled: true,
  },
};

export const ReadOnly: Story = {
  args: {
    ...Preview.args,
    readOnly: true,
  },
};

export const WithCustomLabels: Story = {
  args: {
    id: 'timepicker-labels',
    value: '14:30',
    format: 'HH:mm',
    labels: {
      hours: 'Timer',
      minutes: 'Minutter',
    },
    onChange: noop,
  },
};
