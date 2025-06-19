import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioSelect } from './index';

const ComposedComponent = (args): ReactElement => (
  <StudioSelect {...args}>
    <StudioSelect.Option value='1'>Value 1</StudioSelect.Option>
    <StudioSelect.Option value='2'>Value 2</StudioSelect.Option>
  </StudioSelect>
);

type Story = StoryFn<typeof ComposedComponent>;

const meta: Meta = {
  title: 'Components/StudioSelect',
  component: ComposedComponent,
  argTypes: {
    'aria-invalid': {
      control: 'boolean',
      options: ['yes', 'no'],
    },
    width: {
      control: 'radio',
      options: ['full', 'auto'],
    },
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
      options: [true, false],
    },
    readOnly: {
      control: 'boolean',
      options: [true, false],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <ComposedComponent {...args} />;

Preview.args = {
  label: 'My select label',
  description: 'My select description',
  'data-size': 'sm',
  width: 'full',
};

export default meta;
