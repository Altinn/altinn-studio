import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioSectionHeader } from './StudioSectionHeader';
import { PencilIcon } from '@studio/icons';

const meta = {
  title: 'Components/StudioSectionHeader',
  component: StudioSectionHeader,
  argTypes: {
    icon: {
      control: false,
    },
  },
} satisfies Meta<typeof StudioSectionHeader>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    icon: <PencilIcon />,
    heading: {
      text: 'Heading',
      level: 2,
    },
    helpText: {
      text: 'My descriptive help text goes here!',
      title: 'Help text title',
    },
  },
};
