import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioFormGroup } from '.';
import { StudioTextfield } from '../StudioTextfield';
import { StudioCheckbox } from '../StudioCheckbox';

const ComposedComponent = (args): ReactElement => (
  <StudioFormGroup {...args}>
    <StudioTextfield label='Tekstfelt 1' />
    <StudioTextfield label='Tekstfelt 2' />
    <StudioCheckbox label='Checkbox' />
  </StudioFormGroup>
);

const meta = {
  title: 'Components/StudioFormGroup',
  component: ComposedComponent,
  argTypes: {
    'data-size': {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof ComposedComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    legend: 'My Formgroup',
    description: 'My description',
    tagText: 'Obligatorisk',
    required: true,
    'data-size': 'sm',
  },
};
