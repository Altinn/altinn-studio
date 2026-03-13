import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCodeFragment } from './StudioCodeFragment';

const meta = {
  title: 'Components/StudioCodeFragment',
  component: StudioCodeFragment,
} satisfies Meta<typeof StudioCodeFragment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'function multiply(a: number, b:number) { return a * b }',
  },
};
