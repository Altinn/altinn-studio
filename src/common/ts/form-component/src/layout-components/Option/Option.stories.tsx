import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Option } from './Option';
import type { OptionProps } from './Option';

export const OPTION_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  help: 'text',
  optionLabel: 'content',
  optionHelp: 'content',
  optionDescription: 'content',
  icon: 'content',
  direction: 'content',
  componentId: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
  isLoading: 'runtime',
} satisfies PropCategories<OptionProps>;

const meta = {
  title: 'LayoutComponents/Option',
  component: Option,
  excludeStories: ['OPTION_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    direction: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    componentId: 'option-preview',
    title: 'Dyreart',
    optionLabel: 'Hund',
    direction: 'horizontal',
  },
} satisfies Meta<typeof Option>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Vertical: Story = { args: { direction: 'vertical' } };

export const WithHelpText: Story = {
  args: {
    help: 'Dyrearten vi har registrert.',
    optionHelp: 'Pelskledd og lojal mot mennesker',
  },
};

export const WithDescription: Story = {
  args: {
    description: 'Et dyr som bjeffer',
    optionDescription: 'Pelskledd og lojal mot mennesker',
  },
};

export const WithoutTitle: Story = { args: { title: undefined } };

export const Loading: Story = { args: { isLoading: true } };
