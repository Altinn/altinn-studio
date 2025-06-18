import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioNativeSelect } from './StudioNativeSelect';

type Story = StoryFn<typeof StudioNativeSelect>;

const meta: Meta = {
  title: 'Components/StudioNativeSelect',
  component: StudioNativeSelect,
  argTypes: {
    size: {
      control: 'radio',
      options: ['xsmall', 'small', 'medium', 'large'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => (
  <StudioNativeSelect {...args}>
    <option value='1'>Option 1</option>
    <option value='2'>Option 2</option>
    <option value='3'>Option 3</option>
  </StudioNativeSelect>
);

Preview.args = {
  label: 'Label',
  description: 'This is a description',
  size: 'medium',
};
export default meta;
