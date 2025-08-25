import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioFieldset } from './';
import { StudioTextfield } from '../StudioTextfield';

const meta: Meta = {
  title: 'Components/StudioFieldset',
  component: StudioFieldset,
};

type Story = StoryObj<typeof meta>;

const defaultArgs: Story['args'] = {
  children: (
    <>
      <StudioTextfield label='Tekstfelt 1' />
      <StudioTextfield label='Tekstfelt 2' />
    </>
  ),
  legend: 'Legend',
};

export const Preview: Story = {
  args: defaultArgs,
};

export const WithHiddenLegend = {
  args: {
    ...defaultArgs,
    hideLegend: true,
  },
};

export default meta;
