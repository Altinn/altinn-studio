import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioCombobox } from './index';
import { StudioModal } from '../StudioModal';

type Story = StoryFn<typeof StudioCombobox>;

const meta: Meta = {
  title: 'Components/StudioCombobox',
  component: StudioCombobox,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    multiple: {
      control: 'boolean',
    },
  },
};

export const Preview: Story = (args) => {
  return (
    <StudioCombobox {...args}>
      <StudioCombobox.Empty>Empty</StudioCombobox.Empty>
      <StudioCombobox.Option value='1'>Ole</StudioCombobox.Option>
      <StudioCombobox.Option value='2'>Dole</StudioCombobox.Option>
      <StudioCombobox.Option value='3'>Doffen</StudioCombobox.Option>
    </StudioCombobox>
  );
};

Preview.args = {
  label: 'Label',
  description: 'This is a description',
  size: 'sm',
  multiple: true,
};

export const InModal: Story = (args) => {
  return (
    <StudioModal.Root>
      <StudioModal.Trigger>Open modal</StudioModal.Trigger>
      <StudioModal.Dialog heading='Dialog' closeButtonTitle='Close'>
        <StudioCombobox {...args}>
          <StudioCombobox.Empty>Empty</StudioCombobox.Empty>
          <StudioCombobox.Option value='1'>Ole</StudioCombobox.Option>
          <StudioCombobox.Option value='2'>Dole</StudioCombobox.Option>
          <StudioCombobox.Option value='3'>Doffen</StudioCombobox.Option>
        </StudioCombobox>
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
};

export default meta;
