import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioBlobDownloader } from './StudioBlobDownloader';

type Story = StoryFn<typeof StudioBlobDownloader>;

const meta: Meta = {
  title: 'Components/StudioBlobDownloader',
  component: StudioBlobDownloader,
};
export default meta;

export const Preview: Story = (args): React.ReactElement => <StudioBlobDownloader {...args} />;
Preview.args = {
  data: JSON.stringify({ test: 'test' }),
  fileName: 'testtest.json',
  fileType: 'application/json',
  linkText: 'Download JSON',
};
