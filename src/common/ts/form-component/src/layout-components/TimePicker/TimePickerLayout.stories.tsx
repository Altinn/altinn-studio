import { useState } from 'react';

import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimePickerLayout } from './TimePickerLayout';
import type { TimePickerLayoutProps } from './TimePickerLayout';

export const TIMEPICKER_PROP_CATEGORIES = {
  title: 'text',
  help: 'text',
  description: 'text',
  value: 'data',
  componentId: 'content',
  format: 'content',
  minTime: 'content',
  maxTime: 'content',
  readOnly: 'content',
  required: 'content',
  showOptionalMarking: 'content',
  labelGrid: 'content',
  onChange: 'runtime',
  innerGrid: 'runtime',
  validationGrid: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<TimePickerLayoutProps>;

const meta = {
  title: 'LayoutComponents/TimePicker',
  component: TimePickerLayout,
  excludeStories: ['TIMEPICKER_PROP_CATEGORIES'],
  parameters: { layout: 'padded' },
  argTypes: {
    format: {
      control: 'select',
      options: ['HH:mm', 'HH:mm:ss', 'hh:mm a', 'hh:mm:ss a'],
    },
  },
  args: {
    componentId: 'timepicker-preview',
    value: '',
    format: 'HH:mm',
    onChange: fn(),
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <TimePickerLayout
        {...args}
        value={value}
        onChange={(newValue) => {
          args.onChange?.(newValue);
          setValue(newValue);
        }}
      />
    );
  },
} satisfies Meta<typeof TimePickerLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Velg tidspunkt',
    description: 'Angi ønsket klokkeslett.',
    help: 'Bruk formatet TT:MM.',
  },
};

export const ReadOnly: Story = {
  args: {
    value: '14:30',
    readOnly: true,
  },
};

export const WithMinMax: Story = {
  args: {
    minTime: '08:00',
    maxTime: '17:00',
  },
};

export const TwelveHourFormat: Story = {
  args: {
    format: 'hh:mm a',
    value: '02:30 PM',
  },
};

export const WithSeconds: Story = {
  args: {
    format: 'HH:mm:ss',
    value: '14:30:45',
  },
};
