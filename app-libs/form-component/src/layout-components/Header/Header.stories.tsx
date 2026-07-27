import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Header } from './Header';
import type { HeaderProps } from './Header';

export const HEADER_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  title: 'text',
  help: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  size: 'content',
  innerGrid: 'content',
} satisfies PropCategories<HeaderProps>;

const meta = {
  title: 'LayoutComponents/Header',
  component: Header,
  excludeStories: ['HEADER_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['L', 'M', 'S', 'h2', 'h3', 'h4'],
    },
  },
  args: {
    componentId: 'header-preview',
    title: 'Personopplysninger',
    size: 'L',
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Medium: Story = {
  args: {
    title: 'Kontaktinformasjon',
    size: 'M',
  },
};

export const Small: Story = {
  args: {
    title: 'Tilleggsopplysninger',
    size: 'S',
  },
};

export const WithHelpText: Story = {
  args: {
    title: 'Personopplysninger',
    help: 'Denne **hjelpeteksten** forklarer hvilke opplysninger som skal fylles ut.',
    size: 'L',
  },
};
