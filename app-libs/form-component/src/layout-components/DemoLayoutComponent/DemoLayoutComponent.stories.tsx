import type { Meta, StoryObj } from '@storybook/react-vite';

import { DemoLayoutComponent } from './DemoLayoutComponent';

const meta = {
  title: 'LayoutComponents/DemoLayoutComponent',
  component: DemoLayoutComponent,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DemoLayoutComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    content: 'This is a plain text',
  },
};

export const withHtml: Story = {
  args: {
    content: `<h3>This is content set with props a html, but can be html or mark down</h3>
      <p>And this is a <strong>paragraph</strong></p>
      <ul>
        <li>And this is a list item</li>
        <li>And this is another list item</li>
      </ul>`,
  },
};

export const WithMarkdown: Story = {
  args: {
    content: `### This is content set with props a text, but can be **html** or **mark down**

And this is a **paragraph**

- And this is a list item
- And this is another list item`,
  },
};
