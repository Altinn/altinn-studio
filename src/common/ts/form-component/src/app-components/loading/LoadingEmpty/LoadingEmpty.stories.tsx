import type { Meta, StoryObj } from '@storybook/react-vite';

import { LoadingEmpty } from './LoadingEmpty';

const meta = {
  title: 'AppComponents/Loading/LoadingEmpty',
  component: LoadingEmpty,
} satisfies Meta<typeof LoadingEmpty>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `LoadingEmpty` renders a visually hidden `<div data-loading />`. It carries no
 * visible UI — its purpose is to signal to the PDF generator that the page is not
 * yet ready. Inspect the DOM to see the rendered element.
 */
export const Preview: Story = {};
