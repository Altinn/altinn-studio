import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioFormGroup } from './index';
import { StudioTextfield } from '../StudioTextfield';
import { StudioCheckbox } from '../StudioCheckbox';

const ComposedComponent = (args): ReactElement => (
  <StudioFormGroup {...args}>
    <StudioTextfield label='Tekstfelt 1' />
    <StudioTextfield label='Tekstfelt 2' />
    <StudioCheckbox label='Checkbox' />
  </StudioFormGroup>
);

type Story = StoryFn<typeof ComposedComponent>;

const meta: Meta = {
  title: 'Components/StudioFormGroup',
  component: ComposedComponent,
  argTypes: {
    'data-size': {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};
export const Preview: Story = (args): ReactElement => <ComposedComponent {...args} />;

Preview.args = {
  legend: 'My Formgroup',
  description: 'My description',
  tagText: 'Obligatorisk',
  required: true,
  'data-size': 'sm',
};
export default meta;
