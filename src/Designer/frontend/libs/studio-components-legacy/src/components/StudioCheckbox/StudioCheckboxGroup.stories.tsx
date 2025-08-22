import type { ReactElement } from 'react';
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { StudioCheckboxGroupProps } from './';
import { StudioCheckbox } from './';

function CheckboxGroupPreview(props: StudioCheckboxGroupProps): ReactElement {
  return (
    <StudioCheckbox.Group {...props}>
      <StudioCheckbox value='1'>Checkbox 1</StudioCheckbox>
      <StudioCheckbox value='2'>Checkbox 2</StudioCheckbox>
      <StudioCheckbox value='3'>Checkbox 3</StudioCheckbox>
    </StudioCheckbox.Group>
  );
}

type Story = StoryObj<typeof CheckboxGroupPreview>;

const meta: Meta<typeof CheckboxGroupPreview> = {
  title: 'Components/StudioCheckbox/Group',
  component: CheckboxGroupPreview,
  argTypes: {
    legend: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
    readOnly: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    error: {
      control: 'text',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    hideLegend: {
      control: 'boolean',
    },
  },
};
export default meta;

export const Preview: Story = {
  args: {
    legend: 'Lorem ipsum dolor sit amet',
    description: 'Praesent vel tellus sed est condimentum vestibulum.',
    readOnly: false,
    disabled: false,
    error: '',
    size: 'sm',
    hideLegend: false,
  },
};
