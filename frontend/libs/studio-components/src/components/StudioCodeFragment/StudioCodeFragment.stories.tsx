import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioCodeFragment } from './StudioCodeFragment';

type Story = StoryFn<typeof StudioCodeFragment>;

const meta: Meta = {
  title: 'Components/StudioCodeFragment',
  component: StudioCodeFragment,
};

export default meta;
export const Preview: Story = (args) => <StudioCodeFragment {...args}></StudioCodeFragment>;

Preview.args = {
  children: 'function multiply(a: number, b:number) { return a * b }',
};
