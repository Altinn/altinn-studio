import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioButton } from './StudioButton';
import { PencilIcon } from '@studio/icons';

const meta = {
  title: 'Components/StudioButton',
  component: StudioButton,
  argTypes: {
    iconPlacement: {
      control: 'radio',
      options: ['left', 'right'],
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
  },
} satisfies Meta<typeof StudioButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Text',
    iconPlacement: 'left',
    icon: <PencilIcon />,
  },
};
