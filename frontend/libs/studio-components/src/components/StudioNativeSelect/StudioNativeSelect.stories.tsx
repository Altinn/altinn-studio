import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioNativeSelect, type SelectOption } from './StudioNativeSelect';

type Story = StoryFn<typeof StudioNativeSelect>;

const meta: Meta = {
  title: 'Studio/StudioNativeSelect',
  component: StudioNativeSelect,
  argTypes: {
    size: {
      control: 'radio',
      options: ['xsmall', 'small', 'medium', 'large'],
    },
    options: {
      control: {
        type: 'object',
        mapping: {
          value: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioNativeSelect {...args} />;

Preview.args = {
  label: 'Label',
  description: 'This is a description',
  size: 'medium',
  options: [
    { value: 'value1', label: 'Label 1' },
    { value: 'value2', label: 'Label 2' },
  ] as SelectOption[],
};
export default meta;
