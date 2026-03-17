import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioLink } from './StudioLink';
import { PencilIcon } from '@studio/icons';

const meta = {
  title: 'Components/StudioLink',
  component: StudioLink,
  argTypes: {
    iconPlacement: {
      control: 'radio',
      options: ['left', 'right'],
    },
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof StudioLink>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Text',
    iconPlacement: 'left',
    href: 'https://designsystemet.no/',
    icon: <PencilIcon />,
    'data-size': 'sm',
  },
};
