import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioLinkButton } from './StudioLinkButton';
import { PencilIcon } from '@studio/icons';

const meta = {
  title: 'Components/StudioLinkButton',
  component: StudioLinkButton,
  argTypes: {
    iconPlacement: {
      control: 'radio',
      options: ['left', 'right'],
    },
    'data-size': {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    'data-color': {
      control: 'radio',
      options: ['neutral', 'info', 'danger', 'success', 'warning'],
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
  },
} satisfies Meta<typeof StudioLinkButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Text',
    iconPlacement: 'left',
    href: 'https://designsystemet.no/',
    icon: <PencilIcon />,
    'data-size': 'sm',
    'data-color': 'info',
    // variant: 'primary',
  },
};
