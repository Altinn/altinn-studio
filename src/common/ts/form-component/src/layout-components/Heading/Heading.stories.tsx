import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Heading } from './Heading';
import type { HeadingProps } from './Heading';

export const HEADING_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  title: 'text',
  help: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  size: 'content',
  innerGrid: 'content',
} satisfies PropCategories<HeadingProps>;

const meta = {
  title: 'LayoutComponents/Heading',
  component: Heading,
  excludeStories: ['HEADING_PROP_CATEGORIES'],
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
    componentId: 'heading-preview',
    title: 'Personopplysninger',
    size: 'L',
  },
} satisfies Meta<typeof Heading>;

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
