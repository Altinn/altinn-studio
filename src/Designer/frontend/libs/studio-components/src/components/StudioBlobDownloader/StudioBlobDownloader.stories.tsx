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
    getData: () => JSON.stringify({ test: 'test' }),
    fileName: 'testtest.json',
    fileType: 'application/json',
    linkText: 'Download JSON',
  },
};

export const WithLazyGeneration: Story = {
  args: {
    getData: () => {
      return JSON.stringify({
        timestamp: Date.now(),
        message: 'This data is generated when you click the button!',
      });
    },
    fileName: 'lazy-generated.json',
    fileType: 'application/json',
    linkText: 'Download with Lazy Generation',
  },
};

export const WithComplexData: Story = {
  args: {
    getData: () => {
      const complexData = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
        })),
        generatedAt: new Date().toISOString(),
      };
      return JSON.stringify(complexData, null, 2);
    },
    fileName: 'complex-data.json',
    fileType: 'application/json',
    linkText: 'Download complex Data',
  },
};
