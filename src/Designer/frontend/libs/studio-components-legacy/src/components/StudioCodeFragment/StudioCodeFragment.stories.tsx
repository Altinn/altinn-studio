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
    children: 'Please use the h1-tag like this: <h1>This is the main title</h1>',
  },
};
