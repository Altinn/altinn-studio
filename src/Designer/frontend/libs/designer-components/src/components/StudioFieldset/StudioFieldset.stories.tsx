import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioFieldset } from './';
import { StudioTextfield } from '../StudioTextfield';

const meta = {
  title: 'Components/StudioFieldset',
  component: StudioFieldset,
} satisfies Meta<typeof StudioFieldset>;
export default meta;

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

export const WithHiddenLegend: Story = {
  args: {
    ...defaultArgs,
    hideLegend: true,
  },
};
