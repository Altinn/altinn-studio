import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioSelect } from './index';

const ComposedComponent = (args): ReactElement => (
  <StudioSelect {...args}>
    <StudioSelect.Option value='1'>Value 1</StudioSelect.Option>
    <StudioSelect.Option value='2'>Value 2</StudioSelect.Option>
  </StudioSelect>
);

const meta = {
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
} satisfies Meta<typeof ComposedComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    label: 'My select label',
    description: 'My select description',
    'data-size': 'sm',
    width: 'full',
  },
};
