import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { CustomButton } from './CustomButton';
import type { CustomButtonProps } from './CustomButton';

export const CUSTOM_BUTTON_PROP_CATEGORIES = {
  title: 'text',
  componentId: 'content',
  buttonStyle: 'content',
  buttonColor: 'content',
  buttonSize: 'content',
  disabled: 'runtime',
  isLoading: 'runtime',
  onClick: 'runtime',
} satisfies PropCategories<CustomButtonProps>;

const meta = {
  title: 'LayoutComponents/CustomButton',
  component: CustomButton,
  excludeStories: ['CUSTOM_BUTTON_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'custom-button-preview',
    title: 'Velg neste steg',
    onClick: fn(),
  },
} satisfies Meta<typeof CustomButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Primary: Story = {
  args: {
    componentId: 'custom-button-primary',
    buttonStyle: 'primary',
    title: 'Fullfør',
  },
};

export const Tertiary: Story = {
  args: {
    componentId: 'custom-button-tertiary',
    buttonStyle: 'tertiary',
    title: 'Avbryt',
  },
};

export const Loading: Story = {
  args: {
    componentId: 'custom-button-loading',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    componentId: 'custom-button-disabled',
    disabled: true,
  },
};
