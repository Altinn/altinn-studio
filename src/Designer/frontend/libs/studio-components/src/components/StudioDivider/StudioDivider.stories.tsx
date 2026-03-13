import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDivider } from './StudioDivider';

const meta = {
  title: 'Components/StudioDivider',
  component: StudioDivider,
} satisfies Meta<typeof StudioDivider>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  render: () => (
    <div>
      <p>Content above divider</p>
      <StudioDivider />
      <p>Content below divider</p>
    </div>
  ),
};
