import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDisplayTile } from './StudioDisplayTile';
import { PencilIcon } from '@studio/icons';

const meta = {
  title: 'Components/StudioDisplayTile',
  component: StudioDisplayTile,
} satisfies Meta<typeof StudioDisplayTile>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    label: 'Label',
    value: 'Value',
    icon: <PencilIcon />,
  },
};
