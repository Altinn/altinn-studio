import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { IFrame } from './IFrame';
import type { IFrameProps } from './IFrame';

export const IFRAME_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  title: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  sandbox: 'content',
  // Runtime — injected by wrapper
  innerGrid: 'runtime',
} satisfies PropCategories<IFrameProps>;

const meta = {
  title: 'LayoutComponents/IFrame',
  component: IFrame,
  excludeStories: ['IFRAME_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'iframe-preview',
    title:
      '<h2>Velkommen</h2><p>Dette innholdet vises inne i en <strong>iframe</strong> via srcdoc.</p>',
  },
} satisfies Meta<typeof IFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithPopupsAllowed: Story = {
  args: {
    title: '<p>Denne rammen tillater popup-vinduer.</p>',
    sandbox: {
      allowPopups: true,
    },
  },
};
