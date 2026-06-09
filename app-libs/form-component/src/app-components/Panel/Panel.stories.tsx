import type { Meta, StoryObj } from '@storybook/react-vite';

import { Panel } from './Panel';
import type { PanelVariant } from './Panel';

const PANEL_VARIANTS: PanelVariant[] = ['info', 'warning', 'error', 'success'];

const meta = {
  title: 'AppComponents/Panel',
  component: Panel,
  argTypes: {
    variant: {
      control: 'select',
      options: PANEL_VARIANTS,
    },
  },
} satisfies Meta<typeof Panel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Information',
    showIcon: true,
    children: 'This is an informational panel for guiding the user.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    showIcon: true,
    children: 'Something requires your attention before continuing.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Error',
    showIcon: true,
    children: 'An error occurred while processing your request.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success',
    showIcon: true,
    children: 'The action completed successfully.',
  },
};

export const WithoutIcon: Story = {
  args: {
    variant: 'info',
    title: 'Plain panel',
    children: 'A panel rendered without the leading icon.',
  },
};

export const WithoutTitle: Story = {
  args: {
    variant: 'info',
    showIcon: true,
    children: 'A panel without a title, only body content.',
  },
};

export const ForcedMobileLayout: Story = {
  args: {
    variant: 'info',
    title: 'Mobile layout',
    showIcon: true,
    forceMobileLayout: true,
    children: 'Uses mobile spacing and icon size regardless of viewport width.',
  },
};
