import { AppCard } from '@app/form-component/app-components';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageLayout } from './ImageLayout';
import type { ImageLayoutProps } from './ImageLayout';

/**
 * Sorts each prop into a Storybook docs group.
 */
export const IMAGE_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section (textResourceBindings)
  altText: 'text',
  help: 'text',
  // Configurable options — Studio "Innhold" section (image.*)
  componentId: 'content',
  src: 'content',
  width: 'content',
  align: 'content',
  innerGrid: 'content',
  // Injected by the runtime wrapper — not part of the Studio configuration
  renderedInCardMedia: 'runtime',
  cardMediaHeight: 'runtime',
} satisfies PropCategories<ImageLayoutProps>;

// A self-contained SVG data URI so the playground renders without a network image.
const exampleSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'>
  <rect width='100%' height='100%' fill='rgb(29,52,84)' rx='8'/>
  <text x='50%' y='50%' fill='white' font-size='32' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif'>Bilde</text>
</svg>`;
const EXAMPLE_IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(exampleSvg)}`;

const meta = {
  title: 'LayoutComponents/Image',
  component: ImageLayout,
  // IMAGE_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['IMAGE_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    align: {
      control: 'radio',
      options: [
        'flex-start',
        'center',
        'flex-end',
        'space-between',
        'space-around',
        'space-evenly',
      ],
    },
  },
  args: {
    componentId: 'image-preview',
    src: EXAMPLE_IMAGE_SRC,
    width: '400px',
    align: 'center',
    altText: 'Illustrasjon av et bilde',
  },
} satisfies Meta<typeof ImageLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithHelpText: Story = {
  args: {
    help: 'Bildet viser et eksempel på hvordan skjemaet skal fylles ut.',
  },
};

export const RightAligned: Story = {
  args: {
    align: 'flex-end',
  },
};

/**
 * When rendered as the media of a parent Card, the image is shown on its own — without the
 * label/help wrapper — filling the card's media slot. Here it is placed inside a real `AppCard`
 * so the `renderedInCardMedia`/`cardMediaHeight` props read in the context they are meant for.
 */
export const InCardMedia: Story = {
  args: {
    renderedInCardMedia: true,
    cardMediaHeight: '200px',
    width: '100%',
  },
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <AppCard
        title='Søknad om barnehageplass'
        description='Fyll ut skjemaet for å søke om plass.'
        media={<ImageLayout {...args} />}
      />
    </div>
  ),
};
