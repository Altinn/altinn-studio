import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioFileUploader } from './StudioFileUploader';
import { Alert } from '@digdir/designsystemet-react';

type Story = StoryFn<typeof StudioFileUploader>;

const meta: Meta = {
  title: 'StudioFileUploader',
  component: StudioFileUploader,
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
    onInvalidFileName: {
      control: 'boolean',
      description:
        'Set to `true` to simulate that the file name validation would be handled outside of the component',
    },
    fileNameRegEx: {
      control: 'select',
      description:
        'The first example regExp allows all strings. The second example regExp does only allow digits and punctuations.',
      options: ['^.*$', '^[0-9!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~]+$'],
    },
  },
};

export const Preview: Story = (args): React.ReactElement => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showError, setShowError] = useState<boolean>(false);

  const regEx = args.fileNameRegEx ? new RegExp(args.fileNameRegEx) : undefined;

  const handleInvalidFileName = () => {
    args.onInvalidFileName && setShowError(true);
  };
  return (
    <>
      <StudioFileUploader
        {...args}
        onInvalidFileName={handleInvalidFileName}
        fileNameRegEx={regEx}
        ref={fileInputRef}
      />
      {showError && (
        <Alert size='small' severity='danger'>
          {'File name regEx validation message that was handled outside of the component'}
        </Alert>
      )}
    </>
  );
};

Preview.args = {
  uploaderButtonText: 'Last opp fil',
  variant: 'tertiary',
  onUploadFile: () => {},
  onInvalidFileName: false as unknown as any,
  disabled: false,
};
export default meta;
