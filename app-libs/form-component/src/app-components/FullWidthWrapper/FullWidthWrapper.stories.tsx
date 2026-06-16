import type { CSSProperties } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { FullWidthWrapper } from './FullWidthWrapper';

const modalFrameStyle = {
  '--modal-padding-x': '24px',
  '--modal-padding-y': '24px',
  maxWidth: '24rem',
  padding: 'var(--modal-padding-y) var(--modal-padding-x)',
  outline: '1px dashed var(--ds-color-neutral-border-subtle)',
} as CSSProperties;

const meta = {
  title: 'AppComponents/FullWidthWrapper',
  component: FullWidthWrapper,
  args: {
    children: 'Full-width content',
  },
  render: (args) => (
    <div style={modalFrameStyle}>
      <FullWidthWrapper {...args} />
    </div>
  ),
} satisfies Meta<typeof FullWidthWrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
export const ConsumeTopPadding: Story = { args: { isOnTop: true } };
export const ConsumeBottomPadding: Story = { args: { isOnBottom: true } };
export const ConsumeTopAndBottomPadding: Story = { args: { isOnTop: true, isOnBottom: true } };
