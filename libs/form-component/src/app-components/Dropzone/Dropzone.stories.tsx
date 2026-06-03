import type { Meta, StoryObj } from '@storybook/react-vite';

import { Dropzone } from './Dropzone';

const meta = {
  title: 'AppComponents/Dropzone',
  component: Dropzone,
  args: {
    id: 'storybook-dropzone',
    readOnly: false,
    hasValidationMessages: false,
    onDrop: () => undefined,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <strong>Drag and drop files here</strong>
        <span>or click to browse</span>
      </div>
    ),
  },
} satisfies Meta<typeof Dropzone>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithMaxFileSize: Story = {
  args: {
    maxFileSize: { sizeInMB: 25, text: 'Max file size: 25 MB' },
  },
};

export const WithValidationError: Story = {
  args: {
    hasValidationMessages: true,
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
};

export const AcceptedFileTypes: Story = {
  args: {
    acceptedFiles: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif'] },
  },
};
