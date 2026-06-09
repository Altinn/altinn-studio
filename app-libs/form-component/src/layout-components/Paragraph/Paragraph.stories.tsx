import { type ReactElement } from 'react';

import { LanguageTranslatorProvider } from '@app/form-component/LanguageTranslatorProvider';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Paragraph } from './Paragraph';

const TEXTS: Record<string, string | ReactElement> = {
  'paragraph.basic': 'This is a paragraph of presentational text shown in a form.',
  'paragraph.inline': (
    <span>
      Paragraph with <strong>bold</strong> and <em>emphasised</em> inline elements.
    </span>
  ),
  'paragraph.help': 'This help text gives the user more context about the paragraph.',
};

const STRINGS: Record<string, string> = {
  'paragraph.basic': 'This is a paragraph of presentational text shown in a form.',
  'helptext.button_title': 'Help',
  'helptext.button_title_prefix': 'Help for',
};

const meta = {
  title: 'LayoutComponents/Paragraph',
  component: Paragraph,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <LanguageTranslatorProvider
        lang={(key) => (key ? (TEXTS[key] ?? key) : null)}
        langAsString={(key) => (key ? (STRINGS[key] ?? key) : '')}
      >
        <Story />
      </LanguageTranslatorProvider>
    ),
  ],
  args: {
    id: 'paragraph-preview',
    title: 'paragraph.basic',
  },
} satisfies Meta<typeof Paragraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const InlineFormatting: Story = {
  args: {
    title: 'paragraph.inline',
  },
};

export const WithHelpText: Story = {
  args: {
    title: 'paragraph.basic',
    help: 'paragraph.help',
  },
};
