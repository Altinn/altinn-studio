import React, { useState } from 'react';
import type { StudioFileUploaderProps } from './StudioFileUploader';
import { StudioFileUploader } from './StudioFileUploader';
import { Alert } from '@digdir/designsystemet-react';

type StudioFileUploaderWrapperProps = Exclude<StudioFileUploaderProps, 'customFileValidation'> & {
  validateFileName: boolean;
  onInvalidFileName: boolean;
  fileSizeLimitMb: number;
  onInvalidFileSize: boolean;
};

export const StudioFileUploadWrapper = (
  props: StudioFileUploaderWrapperProps,
): React.ReactElement => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showFileNameError, setShowFileNameError] = useState<boolean>(false);
  const [showFileSizeError, setShowFileSizError] = useState<boolean>(false);

  const handleFileNameValidation = () => {
    props.onInvalidFileName && setShowFileNameError(!props.validateFileName);
  };

  const handleFileSizeValidation = () => {
    props.onInvalidFileSize && setShowFileSizError(props.onInvalidFileSize);
  };

  const handleSuccessfulUpload = () => {
    setShowFileNameError(false);
    setShowFileSizError(false);
  };

  return (
    <>
      <StudioFileUploader
        {...props}
        onUploadFile={handleSuccessfulUpload}
        customFileValidation={{
          validateFileName: () => props.validateFileName,
          onInvalidFileName: handleFileNameValidation,
          fileSizeLimitMb: props.fileSizeLimitMb,
          onInvalidFileSize: handleFileSizeValidation,
        }}
        ref={fileInputRef}
      />
      {showFileNameError && (
        <Alert size='small' severity='danger'>
          {'File name invalidation was handled outside of the component'}
        </Alert>
      )}
      {showFileSizeError && (
        <Alert size='small' severity='danger'>
          {'File size invalidation was handled outside of the component'}
        </Alert>
      )}
    </>
  );
};
