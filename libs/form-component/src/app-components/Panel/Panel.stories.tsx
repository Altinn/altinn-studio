import type { Meta, StoryObj } from '@storybook/react-vite';

import { PANEL_VARIANT } from './constants';
import { Panel } from './Panel';

const meta = {
  title: 'AppComponents/Panel',
  component: Panel,
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(PANEL_VARIANT),
    },
  },
} satisfies Meta<typeof Panel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: PANEL_VARIANT.Info,
    title: 'Information',
    showIcon: true,
    children: 'This is an informational panel for guiding the user.',
  },
};

export const Warning: Story = {
  args: {
    variant: PANEL_VARIANT.Warning,
    title: 'Warning',
    showIcon: true,
    children: 'Something requires your attention before continuing.',
  },
};

export const Error: Story = {
  args: {
    variant: PANEL_VARIANT.Error,
    title: 'Error',
    showIcon: true,
    children: 'An error occurred while processing your request.',
  },
};

export const Success: Story = {
  args: {
    variant: PANEL_VARIANT.Success,
    title: 'Success',
    showIcon: true,
    children: 'The action completed successfully.',
  },
};

export const WithoutIcon: Story = {
  args: {
    variant: PANEL_VARIANT.Info,
    title: 'Plain panel',
    children: 'A panel rendered without the leading icon.',
  },
};

export const WithoutTitle: Story = {
  args: {
    variant: PANEL_VARIANT.Info,
    showIcon: true,
    children: 'A panel without a title, only body content.',
  },
};

export const ForcedMobileLayout: Story = {
  args: {
    variant: PANEL_VARIANT.Info,
    title: 'Mobile layout',
    showIcon: true,
    forceMobileLayout: true,
    children: 'Uses mobile spacing and icon size regardless of viewport width.',
  },
};
