import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Text } from './Text';
import type { TextProps } from './Text';

export const TEXT_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  help: 'text',
  value: 'content',
  icon: 'content',
  direction: 'content',
  componentId: 'content',
  innerGrid: 'content',
} satisfies PropCategories<TextProps>;

const meta = {
  title: 'LayoutComponents/Text',
  component: Text,
  excludeStories: ['TEXT_PROP_CATEGORIES'],
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
    componentId: 'text-preview',
    title: 'Registrert adresse',
    value: 'Storgata 1, 0155 Oslo',
    direction: 'horizontal',
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Vertical: Story = { args: { direction: 'vertical' } };

export const WithHelpText: Story = {
  args: {
    help: 'Adressen vi har registrert på deg i Folkeregisteret.',
  },
};

export const WithDescription: Story = {
  args: { description: 'Dette er adressen vi sender post til.' },
};

export const WithoutTitle: Story = { args: { title: undefined } };
