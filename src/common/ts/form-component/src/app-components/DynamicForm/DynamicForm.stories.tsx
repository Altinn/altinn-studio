import { useState } from 'react';
import type { MonthCaptionProps } from 'react-day-picker';

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSONSchema7 } from 'json-schema';

import { DynamicForm } from './DynamicForm';
import type { FormDataObject } from './DynamicForm';

import 'react-day-picker/style.css';

const NoopDropdownCaption = ({ calendarMonth }: MonthCaptionProps) => (
  <div style={{ padding: 8, fontWeight: 600 }}>
    {calendarMonth.date.toLocaleString('en', { month: 'long', year: 'numeric' })}
  </div>
);

const meta = {
  title: 'AppComponents/DynamicForm',
  component: DynamicForm,
} satisfies Meta<typeof DynamicForm>;

export default meta;

type Story = StoryObj<typeof meta>;

const Wrapper = (args: React.ComponentProps<typeof DynamicForm>) => {
  const [data, setData] = useState<FormDataObject>(args.initialData ?? {});
  return <DynamicForm {...args} initialData={data} onChange={(next) => setData(next)} />;
};

const personSchema: JSONSchema7 = {
  type: 'object',
  required: ['firstName'],
  properties: {
    firstName: { type: 'string', title: 'First name' },
    lastName: { type: 'string', title: 'Last name' },
    age: { type: 'integer', title: 'Age' },
    subscribed: { type: 'boolean', title: 'Subscribed to newsletter' },
    favoriteColor: {
      type: 'string',
      title: 'Favorite color',
      enum: ['red', 'green', 'blue'],
    },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
      },
    },
  },
};

export const Preview: Story = {
  args: {
    schema: personSchema,
    locale: 'en',
    DropdownCaption: NoopDropdownCaption,
    buttonAriaLabel: 'Open date picker',
    calendarIconTitle: 'Calendar',
    getDatepickerFormat: (format) => format,
    onChange: () => {},
  },
  render: (args) => <Wrapper {...args} />,
};

export const WithInitialData: Story = {
  args: {
    ...Preview.args,
    initialData: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      age: 36,
      subscribed: true,
      favoriteColor: 'green',
      address: { street: 'Analytical Engine Ln', city: 'London' },
    },
  },
  render: (args) => <Wrapper {...args} />,
};
