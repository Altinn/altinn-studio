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
    format: 'dd.MM.yyyy',
    value: '',
    onValueChange: fn(),
  },
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
    value: '2025-03-15',
    readOnly: true,
  },
};

export const WithMinMax: Story = {
  args: {
    minDate: '2025-01-01',
    maxDate: '2025-12-31',
  },
};

export const WithValidationMessages: Story = {
  args: {
    validationMessages: 'You must enter a valid date.',
  },
};
