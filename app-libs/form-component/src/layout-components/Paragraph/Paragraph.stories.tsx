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
  },
} satisfies Meta<typeof Paragraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'This is a plain text paragraph shown in a form.',
  },
};

export const WithHtml: Story = {
  args: {
    title: `<h3>This is content set with props as html, but can be html or markdown</h3>
      <p>And this is a <strong>paragraph</strong></p>
      <ul>
        <li>And this is a list item</li>
        <li>And this is another list item</li>
      </ul>`,
  },
};

export const WithMarkdown: Story = {
  args: {
    title: `### This is content set with props as text, but can be **html** or **markdown**

And this is a **paragraph**

- And this is a list item
- And this is another list item`,
  },
};

export const WithHelpText: Story = {
  args: {
    title: 'This is a paragraph with an accompanying help text.',
    help: 'This **help text** gives the user more context about the paragraph.',
  },
};
