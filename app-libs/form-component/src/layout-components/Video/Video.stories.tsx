import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Video } from './Video';
import type { VideoProps } from './Video';

export const VIDEO_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  altText: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  src: 'content',
  innerGrid: 'content',
  // Runtime — injected by wrapper
  mediaHeight: 'runtime',
} satisfies PropCategories<VideoProps>;

const meta = {
  title: 'LayoutComponents/Video',
  component: Video,
  excludeStories: ['VIDEO_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'video-preview',
    altText: 'Video av veiledningen',
    src: {
      nb: 'https://example.com/video-bokmaal.mp4',
      nn: 'https://example.com/video-nynorsk.mp4',
      en: 'https://example.com/video-english.mp4',
    },
  },
} satisfies Meta<typeof Video>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const InCardMedia: Story = {
  args: {
    mediaHeight: 200,
  },
};
