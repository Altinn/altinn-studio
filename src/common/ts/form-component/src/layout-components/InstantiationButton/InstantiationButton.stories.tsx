import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { InstantiationButton } from './InstantiationButton';
import type { InstantiationButtonProps } from './InstantiationButton';

export const INSTANTIATION_BUTTON_PROP_CATEGORIES = {
  title: 'text',
  componentId: 'content',
  addPageMargin: 'runtime',
  disabled: 'runtime',
  isLoading: 'runtime',
  onClick: 'runtime',
} satisfies PropCategories<InstantiationButtonProps>;

const meta = {
  title: 'LayoutComponents/InstantiationButton',
  component: InstantiationButton,
  excludeStories: ['INSTANTIATION_BUTTON_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'instantiation-button-preview',
    title: 'Start innsending',
    onClick: fn(),
  },
} satisfies Meta<typeof InstantiationButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const WithPageMargin: Story = {
  args: {
    addPageMargin: true,
  },
};
