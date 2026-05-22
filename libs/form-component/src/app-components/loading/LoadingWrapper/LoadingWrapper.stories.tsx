import type { Meta, StoryObj } from '@storybook/react-vite';

import { LoadingWrapper } from './LoadingWrapper';

const meta = {
  title: 'AppComponents/Loading/LoadingWrapper',
  component: LoadingWrapper,
  args: {
    children: <p>Pending content lives inside this wrapper.</p>,
  },
} satisfies Meta<typeof LoadingWrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithStyles: Story = {
  args: {
    style: { padding: 16, border: '1px dashed #999' },
    children: <p>Wrapper with custom styles applied via the standard HTML props.</p>,
  },
};
