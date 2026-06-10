import type { Meta, StoryObj } from '@storybook/react-vite';

import { AltinnContentLoader } from './AltinnContentLoader';

const meta = {
  title: 'AppComponents/Loading/AltinnContentLoader',
  component: AltinnContentLoader,
  args: {
    reason: 'storybook-preview',
  },
} satisfies Meta<typeof AltinnContentLoader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Form: Story = {
  args: {
    variant: 'form',
    width: 700,
    height: 620,
  },
};

export const Receipt: Story = {
  args: {
    variant: 'receipt',
    width: 620,
    height: 520,
  },
};

export const CustomSize: Story = {
  args: {
    width: '100%',
    height: 300,
  },
};
