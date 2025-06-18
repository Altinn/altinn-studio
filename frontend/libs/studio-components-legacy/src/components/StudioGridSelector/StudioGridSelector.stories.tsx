import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioGridSelector } from './StudioGridSelector';
import { type GridSize } from './types/GridSize';

type Story = StoryFn<typeof StudioGridSelector>;

const meta: Meta = {
  title: 'Components/StudioGridSelector',
  component: StudioGridSelector,
  argTypes: {
    sliderValue: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
  },
  parameters: {
    actions: { argTypesRegex: 'handleSliderChange' },
  },
};
export const Preview: Story = (args): React.ReactElement => <StudioGridSelector {...args} />;

Preview.args = {
  sliderValue: 0 as GridSize,
  disabled: false,
};
export default meta;
