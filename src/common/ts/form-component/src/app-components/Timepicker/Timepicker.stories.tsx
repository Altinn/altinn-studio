import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimePicker } from './TimePicker';

const meta = {
  title: 'AppComponents/TimePicker',
  component: TimePicker,
} satisfies Meta<typeof TimePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => undefined;

const Wrapper = (args: React.ComponentProps<typeof TimePicker>) => {
  const [value, setValue] = useState(args.value);
  return <TimePicker {...args} value={value} onChange={setValue} />;
};

export const Preview: Story = {
  args: {
    id: 'timepicker-preview',
    value: '14:30',
    format: 'HH:mm',
    onChange: noop,
  },
  render: (args) => <Wrapper {...args} />,
};

export const TwelveHour: Story = {
  args: {
    id: 'timepicker-12h',
    value: '02:30 PM',
    format: 'hh:mm a',
    onChange: noop,
  },
  render: (args) => <Wrapper {...args} />,
};

export const WithSeconds: Story = {
  args: {
    id: 'timepicker-seconds',
    value: '14:30:45',
    format: 'HH:mm:ss',
    onChange: noop,
  },
  render: (args) => <Wrapper {...args} />,
};

export const TwelveHourWithSeconds: Story = {
  args: {
    id: 'timepicker-12h-seconds',
    value: '02:30:45 PM',
    format: 'hh:mm:ss a',
    onChange: noop,
  },
  render: (args) => <Wrapper {...args} />,
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
  render: (args) => <Wrapper {...args} />,
};

export const Disabled: Story = {
  args: {
    ...Preview.args,
    disabled: true,
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
  render: (args) => <Wrapper {...args} />,
};
