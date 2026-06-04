import type { Meta, StoryObj } from '@storybook/react-vite';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { AUDIO_CONFIG_KEYS, Audio } from './Audio';

// The story keys mimic text-resource bindings. The provider below resolves them to display strings,
// the same way the app does at runtime via the language context.
const TEXTS: Record<string, string> = {
  'audio.alt': 'Audio recording of the welcome message.',
};

// A short, freely usable sample clip so the playground actually plays.
const SAMPLE_SRC = 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg';

const meta = {
  title: 'LayoutComponents/Audio',
  component: Audio,
  parameters: {
    layout: 'padded',
    // Only the configurable (Studio-mapped) props get controls; the internal wiring
    // (srcLang, mediaHeight) stays hidden and non-editable.
    controls: { include: AUDIO_CONFIG_KEYS },
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
    id: 'audio-preview',
    src: SAMPLE_SRC,
  },
} satisfies Meta<typeof Audio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithAltText: Story = {
  args: {
    altText: 'audio.alt',
  },
};
