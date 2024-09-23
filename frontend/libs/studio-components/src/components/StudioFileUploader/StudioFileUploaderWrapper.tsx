import React, { useState } from 'react';
import type { StudioFileUploaderProps } from './StudioFileUploader';
import { StudioFileUploader } from './StudioFileUploader';
import { Alert } from '@digdir/designsystemet-react';

type StudioFileUploaderWrapperProps = Exclude<
  StudioFileUploaderProps,
  'customFileNameValidation'
> & {
  validateFileName: boolean;
  onInvalidFileName: boolean;
};

export const StudioFileUploadWrapper = (
  props: StudioFileUploaderWrapperProps,
): React.ReactElement => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showError, setShowError] = useState<boolean>(false);

  const handleFileNameValidation = () => {
    props.onInvalidFileName && setShowError(!props.validateFileName);
  };

  return (
    <>
      <StudioFileUploader
        {...props}
        onUploadFile={() => setShowError(false)}
        customFileNameValidation={{
          validateFileName: () => !!props.validateFileName,
          onInvalidFileName: handleFileNameValidation,
        }}
        ref={fileInputRef}
      />
      {showError && (
        <Alert size='small' severity='danger'>
          {'File name invalidation was handled outside of the component'}
        </Alert>
      )}
    </>
  );
};
