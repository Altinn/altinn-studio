import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioFieldset } from './';
import { StudioTextfield } from '../StudioTextfield';

const ComposedComponent = (args): ReactElement => (
  <StudioFieldset {...args}>
    <StudioTextfield label='Tekstfelt' />
  </StudioFieldset>
);

type Story = StoryFn<typeof ComposedComponent>;

const meta: Meta = {
  title: 'Components/StudioFieldset',
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
  'data-size': 'sm',
  legend: 'My legend',
  description: 'My description',
};
export default meta;
