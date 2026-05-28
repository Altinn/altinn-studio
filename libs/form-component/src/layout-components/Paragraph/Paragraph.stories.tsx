import type { Meta, StoryObj } from '@storybook/react-vite';

import { Paragraph } from './Paragraph';

const meta = {
  title: 'LayoutComponents/Paragraph',
  component: Paragraph,
  args: {
    id: 'paragraph-id',
    title: 'A short paragraph of text shown to the user.',
    titleIsInline: true,
  },
} satisfies Meta<typeof Paragraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithHelpText: Story = {
  args: {
    helpText: 'This is the help text explaining what the paragraph is about.',
    helpTitle: 'Hjelp for paragraph',
    helpTitlePrefix: 'Hjelp for',
  },
};

export const BlockLevelContent: Story = {
  args: {
    title: (
      <>
        <h3>A heading</h3>
        <p>Followed by a paragraph.</p>
      </>
    ),
    titleIsInline: false,
  },
};
