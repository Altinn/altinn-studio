import type { Meta, StoryObj } from '@storybook/react-vite';

import { HelpText } from './HelpText';

const meta = {
  title: 'AppComponents/HelpText',
  component: HelpText,
  parameters: {
    layout: 'centered',
  },
  args: {
    title: 'Help for this field',
    children: 'This is some helpful text that explains what to do.',
  },
} satisfies Meta<typeof HelpText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithTitlePrefix: Story = {
  args: {
    titlePrefix: 'Help for',
    title: 'Date of birth',
  },
};

export const PlacementBottom: Story = {
  args: {
    placement: 'bottom',
  },
};

export const PlacementLeft: Story = {
  args: {
    placement: 'left',
  },
};

export const PlacementTop: Story = {
  args: {
    placement: 'top',
  },
};
