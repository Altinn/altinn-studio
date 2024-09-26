import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioFileUploadWrapper } from './StudioFileUploaderWrapper';

type Story = StoryFn<typeof StudioFileUploadWrapper>;

const meta: Meta = {
  title: 'Components/StudioFileUploader',
  component: StudioFileUploadWrapper,
  argTypes: {
    size: {
      control: 'select',
      options: ['xsmall', 'small', 'medium', 'large'],
    },
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
    disabled: {
      control: 'boolean',
    },
    accept: {
      control: 'text',
      type: 'string',
    },
    validateFileName: {
      control: 'boolean',
      description:
        'Set to `true` to simulate that the file name is valid. Set to `false` to simulate that file name is invalid.',
    },
    onInvalidFileName: {
      control: 'boolean',
      description:
        'Set to `true` to simulate that an invalid file name is handled. Set to `false` to simulate no file name validation handling.',
    },
    fileSizeLimitMb: {
      control: 'number',
      description: 'Set to a number of MB that is the maximum allowed to upoload.',
    },
    onInvalidFileSize: {
      control: 'boolean',
      description:
        'Set to `true` to simulate that an invalid file size is handled. Set to `false` to simulate no file size validation handling.',
    },
    onUploadFile: {
      table: { disable: true },
    },
  },
};

export const Preview: Story = (args): React.ReactElement => {
  return <StudioFileUploadWrapper {...args} />;
};

Preview.args = {
  uploaderButtonText: 'Last opp fil',
  variant: 'tertiary',
  onUploadFile: () => {},
  validateFileName: true,
  onInvalidFileName: false,
  fileSizeLimitMb: 1,
  onInvalidFileSize: false,
  disabled: false,
};
export default meta;
