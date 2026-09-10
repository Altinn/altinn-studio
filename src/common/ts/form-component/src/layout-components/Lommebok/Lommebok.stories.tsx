import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Lommebok } from './Lommebok';
import type { LommebokProps } from './Lommebok';

export const LOMMEBOK_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  componentId: 'content',
  children: 'runtime',
} satisfies PropCategories<LommebokProps>;

const meta = {
  title: 'LayoutComponents/Lommebok',
  component: Lommebok,
  excludeStories: ['LOMMEBOK_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'lommebok-preview',
    title: 'Lommebok',
    description: 'Bekreft identiteten din, eller hent inn dokumenter fra lommeboken din.',
  },
} satisfies Meta<typeof Lommebok>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithoutDescription: Story = {
  args: {
    description: undefined,
  },
};

export const WithDocumentItems: Story = {
  args: {
    children: (
      <div style={{ padding: '0.5rem', border: '1px dashed #ccc' }}>
        Document request/issue items render here
      </div>
    ),
  },
};
