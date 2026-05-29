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
    title: 'This is a paragraph of presentational text shown in a form.',
  },
} satisfies Meta<typeof Paragraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const InlineFormatting: Story = {
  args: {
    title: (
      <span>
        Paragraph with <strong>bold</strong> and <em>emphasised</em> inline elements.
      </span>
    ),
  },
};

export const WithHelpText: Story = {
  args: {
    titleText: 'This is a paragraph of presentational text shown in a form.',
    help: 'This help text gives the user more context about the paragraph.',
  },
};
