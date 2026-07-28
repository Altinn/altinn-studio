import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ActionButton } from './ActionButton';
import type { ActionButtonProps } from './ActionButton';

export const ACTION_BUTTON_PROP_CATEGORIES = {
  title: 'text',
  componentId: 'content',
  id: 'content',
  buttonStyle: 'content',
  disabled: 'runtime',
  isLoading: 'runtime',
  onClick: 'runtime',
  innerGrid: 'content',
} satisfies PropCategories<ActionButtonProps>;

const meta = {
  title: 'LayoutComponents/ActionButton',
  component: ActionButton,
  excludeStories: ['ACTION_BUTTON_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    buttonStyle: {
      control: 'radio',
      options: ['primary', 'secondary'],
    },
  },
  args: {
    componentId: 'action-button-preview',
    id: 'action-button-preview',
    title: 'Bekreft',
    buttonStyle: 'primary',
    onClick: fn(),
  },
} satisfies Meta<typeof ActionButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    title: 'Avslå',
    buttonStyle: 'secondary',
  },
};

export const Loading: Story = {
  args: {
    title: 'Signer',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    title: 'Bekreft',
    disabled: true,
  },
};
