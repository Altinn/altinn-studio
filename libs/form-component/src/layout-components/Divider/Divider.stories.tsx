import type { Meta, StoryObj } from '@storybook/react-vite';

import { Divider } from './Divider';

const meta = {
  title: 'LayoutComponents/Divider',
  component: Divider,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Divider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

// Rendered between content so the horizontal rule is visible in context.
export const BetweenContent: Story = {
  decorators: [
    (Story) => (
      <div>
        <p>Content above the divider.</p>
        <Story />
        <p>Content below the divider.</p>
      </div>
    ),
  ],
};
