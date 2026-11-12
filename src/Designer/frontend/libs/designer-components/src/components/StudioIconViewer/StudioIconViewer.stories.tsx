import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioIconViewer } from './StudioIconViewer';

const meta = {
  title: 'Components/StudioIconViewer',
  component: StudioIconViewer,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof StudioIconViewer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
