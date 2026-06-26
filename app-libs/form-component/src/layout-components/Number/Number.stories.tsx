import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { NumberLayout } from './NumberLayout';
import type { NumberLayoutProps } from './NumberLayout';

export const NUMBER_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  title: 'text',
  // Configurable options — Studio "Innhold" section
  value: 'content',
  formatting: 'content',
  icon: 'content',
  direction: 'content',
  componentId: 'content',
  innerGrid: 'content',
  validationGrid: 'content',
  // Runtime — injected by wrapper
  validationMessages: 'runtime',
} satisfies PropCategories<NumberLayoutProps>;

const meta = {
  title: 'LayoutComponents/Number',
  component: NumberLayout,
  excludeStories: ['NUMBER_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    value: 12345,
    title: 'Antall',
    componentId: 'number-preview',
    direction: 'horizontal',
  },
  argTypes: {
    direction: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof NumberLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Antall ansatte',
    value: 42,
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Inntekt',
    value: 850000,
    icon: 'https://docs.altinn.studio/img/Altinn-logo.svg',
  },
};

export const WithFormatting: Story = {
  args: {
    title: 'Beløp',
    value: 1234567,
    formatting: { number: { thousandSeparator: ' ', suffix: ' kr' } },
  },
};

export const VerticalDirection: Story = {
  args: {
    title: 'Poengsum',
    value: 98,
    direction: 'vertical',
  },
};

export const WithoutTitle: Story = {
  args: {
    title: undefined,
    value: 7890,
  },
};

export const WithValidationMessages: Story = {
  args: {
    title: 'Resultat',
    value: -5,
    validationMessages: 'Verdien kan ikke være negativ.',
  },
};
