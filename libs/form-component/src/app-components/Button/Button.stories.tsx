import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';

const meta = {
  title: 'AppComponents/Button',
  component: Button,
  args: {
    children: 'Save',
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    color: 'first',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    color: 'first',
  },
};

export const Tertiary: Story = {
  args: {
    variant: 'tertiary',
    color: 'second',
  },
};

export const Danger: Story = {
  args: {
    variant: 'primary',
    color: 'danger',
    children: 'Delete',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'Submitting…',
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
  },
  parameters: {
    layout: 'padded',
  },
};
