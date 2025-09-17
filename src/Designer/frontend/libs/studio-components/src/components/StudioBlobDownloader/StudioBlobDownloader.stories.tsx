import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioBlobDownloader } from './StudioBlobDownloader';

type Story = StoryObj<typeof StudioBlobDownloader>;

const meta: Meta = {
  title: 'Components/StudioBlobDownloader',
  component: StudioBlobDownloader,
};
export default meta;

export const Preview: Story = {
  args: {
    data: JSON.stringify({ test: 'test' }),
    fileName: 'testtest.json',
    fileType: 'application/json',
    linkText: 'Download JSON',
  },
};
