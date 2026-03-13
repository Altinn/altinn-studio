import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioGridSelector } from './StudioGridSelector';
const meta = {
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
} satisfies Meta<typeof meta>;
export default meta;

type Story = StoryObj<typeof StudioGridSelector>;

export const Preview: Story = {
  args: {
    sliderValue: 6,
    disabled: false,
  },
};
