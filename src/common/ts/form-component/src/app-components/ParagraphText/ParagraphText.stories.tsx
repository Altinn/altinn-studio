import type { Meta, StoryObj } from '@storybook/react-vite';

import { ParagraphText } from './ParagraphText';

const meta = {
  title: 'AppComponents/ParagraphText',
  component: ParagraphText,
  parameters: {
    layout: 'padded',
  },
  args: {
    children: 'A simple paragraph of text.',
  },
} satisfies Meta<typeof ParagraphText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const InlineFormatting: Story = {
  args: {
    children: (
      <span>
        Paragraph with <strong>bold</strong> and <em>emphasised</em> inline elements.
      </span>
    ),
  },
};

export const BlockContent: Story = {
  args: {
    children: <h3>A heading rendered as block content</h3>,
  },
};
