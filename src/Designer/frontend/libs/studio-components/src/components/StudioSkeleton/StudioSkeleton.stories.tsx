import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioSkeleton } from './';

const meta = {
  title: 'Components/StudioSkeleton',
  component: StudioSkeleton,
} satisfies Meta<typeof StudioSkeleton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    width: 200,
    height: 24,
  },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-size-2)' }}>
      <StudioSkeleton variant='rectangle' width={200} height={24} />
      <StudioSkeleton variant='circle' width={40} height={40} />
      <StudioSkeleton variant='text'>Placeholder for a line of text</StudioSkeleton>
    </div>
  ),
};
