import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Audio } from './Audio';
import type { AudioProps } from './Audio';

export const AUDIO_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  altText: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  src: 'content',
  innerGrid: 'content',
  // Runtime — injected by wrapper
  mediaHeight: 'runtime',
} satisfies PropCategories<AudioProps>;

const meta = {
  title: 'LayoutComponents/Audio',
  component: Audio,
  excludeStories: ['AUDIO_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'audio-preview',
    altText: 'Lydopptak av veiledningen',
    src: {
      nb: 'https://example.com/lydfil-bokmaal.mp3',
      nn: 'https://example.com/lydfil-nynorsk.mp3',
      en: 'https://example.com/audio-english.mp3',
    },
  },
} satisfies Meta<typeof Audio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const InCardMedia: Story = {
  args: {
    mediaHeight: 80,
  },
};
