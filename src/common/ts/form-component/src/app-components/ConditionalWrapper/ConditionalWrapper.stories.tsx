import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConditionalWrapper } from './ConditionalWrapper';

const meta = {
  title: 'AppComponents/ConditionalWrapper',
  component: ConditionalWrapper,
  args: {
    condition: true,
    wrapper: (children) => <div style={{ border: '2px solid blue', padding: 8 }}>{children}</div>,
    children: <p>Wrapped content</p>,
  },
} satisfies Meta<typeof ConditionalWrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Wrapped: Story = {};

export const Unwrapped: Story = {
  args: {
    condition: false,
  },
};

export const Otherwise: Story = {
  args: {
    condition: false,
    otherwise: (children) => (
      <div style={{ border: '2px solid orange', padding: 8 }}>{children}</div>
    ),
  },
};
