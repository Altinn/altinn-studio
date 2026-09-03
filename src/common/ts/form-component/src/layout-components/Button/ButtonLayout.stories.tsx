import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ButtonLayout } from './ButtonLayout';
import type { ButtonLayoutProps } from './ButtonLayout';

export const BUTTON_LAYOUT_PROP_CATEGORIES = {
  title: 'text',
  componentId: 'content',
  size: 'content',
  fullWidth: 'content',
  textAlign: 'content',
  position: 'content',
  disabled: 'runtime',
  isLoading: 'runtime',
  onClick: 'runtime',
  statusMessage: 'runtime',
  innerGrid: 'content',
} satisfies PropCategories<ButtonLayoutProps>;

const meta = {
  title: 'LayoutComponents/Button',
  component: ButtonLayout,
  excludeStories: ['BUTTON_LAYOUT_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    textAlign: {
      control: 'radio',
      options: ['left', 'center', 'right'],
    },
    position: {
      control: 'radio',
      options: ['left', 'center', 'right'],
    },
  },
  args: {
    componentId: 'button-preview',
    title: 'Send inn',
    size: 'md',
    onClick: fn(),
  },
} satisfies Meta<typeof ButtonLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Small: Story = {
  args: {
    title: 'Liten knapp',
    size: 'sm',
  },
};

export const LargeFullWidth: Story = {
  args: {
    title: 'Venstrestilt tekst',
    size: 'lg',
    fullWidth: true,
    textAlign: 'left',
  },
};

export const Loading: Story = {
  args: {
    title: 'Sender inn',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    title: 'Send inn',
    disabled: true,
  },
};
