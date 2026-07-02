import type { Meta, StoryObj } from '@storybook/react-vite';

import { Paragraph } from './Paragraph';

const meta = {
  title: 'LayoutComponents/Paragraph',
  component: Paragraph,
  parameters: {
    layout: 'padded',
  },
  args: {
    id: 'paragraph-preview',
  },
} satisfies Meta<typeof Paragraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Dette er et avsnitt med ren tekst som vises i et skjema.',
  },
};

export const WithHtml: Story = {
  args: {
    title: `<h3>Dette er innhold satt med props som html, men kan være html eller markdown</h3>
      <p>Og dette er et <strong>avsnitt</strong></p>
      <ul>
        <li>Og dette er et listeelement</li>
        <li>Og dette er enda et listeelement</li>
      </ul>`,
  },
};

export const WithMarkdown: Story = {
  args: {
    title: `### Dette er innhold satt med props som tekst, men kan være **html** eller **markdown**

Og dette er et **avsnitt**

- Og dette er et listeelement
- Og dette er enda et listeelement`,
  },
};

export const WithHelpText: Story = {
  args: {
    title: 'Dette er et avsnitt med en tilhørende hjelpetekst.',
    help: 'Denne **hjelpeteksten** gir brukeren mer kontekst om avsnittet.',
  },
};
