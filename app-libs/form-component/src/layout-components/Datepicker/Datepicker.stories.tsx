import { useArgs } from 'storybook/preview-api';
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
  // Keep the `value` control in sync with the selected date, so the Controls panel and the
  // component reflect each other (two-way binding) instead of drifting apart.
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Datepicker
        {...args}
        value={value}
        onValueChange={(newValue) => {
          args.onValueChange(newValue);
          updateArgs({ value: newValue });
        }}
      />
    );
  },
} satisfies Meta<typeof Datepicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
};

export const WithMinMax: Story = {
  args: {
    minDate: '2025-01-01',
    maxDate: '2025-12-31',
  },
};
