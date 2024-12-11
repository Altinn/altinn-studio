import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioStatusRadioGroup } from './StudioStatusRadioGroup';

type Story = StoryFn<typeof StudioStatusRadioGroup>;

const meta: Meta = {
  title: 'Components/StudioStatusRadioGroup',
  component: StudioStatusRadioGroup,
  argTypes: {},
};
//export const Preview: Story = (args) => <StudioStatusRadioGroup {...args}></StudioStatusRadioGroup>;
export const Preview: Story = (args) => <StudioStatusRadioGroup></StudioStatusRadioGroup>;

Preview.args = {};

export default meta;
