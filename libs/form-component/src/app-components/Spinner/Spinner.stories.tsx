import type { Meta, StoryObj } from '@storybook/react-vite';

import { Spinner } from './Spinner';

const meta = {
  title: 'AppComponents/Spinner',
  component: Spinner,
  args: {
    'aria-label': 'Laster',
  },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Small: Story = {
  args: {
    'data-size': 'sm',
  },
};

export const Large: Story = {
  args: {
    'data-size': 'lg',
  },
};
