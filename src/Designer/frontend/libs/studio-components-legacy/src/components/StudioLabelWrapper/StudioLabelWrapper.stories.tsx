import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioLabelWrapper } from './StudioLabelWrapper';

const meta = {
  title: 'Components/StudioLabelWrapper',
  component: StudioLabelWrapper,
} satisfies Meta<typeof StudioLabelWrapper>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    withAsterisk: true,
    children: 'Label',
  },
};
