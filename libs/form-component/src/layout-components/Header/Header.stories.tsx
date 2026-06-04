import type { Meta, StoryObj } from '@storybook/react-vite';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Header } from './Header';

// The story keys mimic text-resource bindings. The provider below resolves them to display strings,
// the same way the app does at runtime via the language context.
const TEXTS: Record<string, string> = {
  'header.title': 'Personal information',
  'header.help': 'This section collects the details we need to process your application.',
  'helptext.button_title_prefix': 'Help for',
  'helptext.button_title': 'Help',
};

const meta = {
  title: 'LayoutComponents/Header',
  component: Header,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['L', 'M', 'S', 'h2', 'h3', 'h4'] },
  },
  decorators: [
    (Story) => (
      <LanguageTranslatorProvider
        lang={(key) => (key ? (TEXTS[key] ?? key) : null)}
        translate={(key) => TEXTS[key] ?? key}
        TranslateComponent={({ tKey }) => TEXTS[tKey] ?? tKey}
      >
        <Story />
      </LanguageTranslatorProvider>
    ),
  ],
  args: {
    id: 'header-preview',
    title: 'header.title',
    size: 'L',
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Medium: Story = {
  args: {
    size: 'M',
  },
};

export const Small: Story = {
  args: {
    size: 'S',
  },
};

export const WithHelpText: Story = {
  args: {
    help: 'header.help',
  },
};
