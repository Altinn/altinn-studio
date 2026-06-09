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
    content:
      '<h2>This is content set with props a text, but can be html or mark down</h2><p>And this is a paragraph</p>',
  },
};

export const WithMarkdown: Story = {
  args: {
    content: `# This is content set with props a text, but can be html or mark down

And this is a paragraph

- And this is a list item
- And this is another list item`,
  },
};
