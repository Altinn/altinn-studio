import React from 'react';
import { FileSelector } from 'app-shared/components';
import { StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useUploadDatamodelMutation } from '../../../../hooks/mutations/useUploadDatamodelMutation';

export interface XSDUploadProps {
  disabled?: boolean;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
}

export const XSDUpload = ({ disabled, submitButtonRenderer }: XSDUploadProps) => {
  const { t } = useTranslation();
  const { mutate: uploadDatamodel, isPending: uploading } = useUploadDatamodelMutation();

  const uploadButton = React.useRef(null);

  const handleUpload = (formData: FormData) => {
    uploadDatamodel(formData);
  };

  return (
    <span ref={uploadButton}>
      {uploading ? (
        <StudioSpinner spinnerTitle={t('app_data_modelling.uploading_xsd')} showSpinnerTitle />
      ) : (
        <FileSelector
          busy={false}
          submitHandler={handleUpload}
          accept='.xsd'
          formFileName='file'
          submitButtonRenderer={submitButtonRenderer}
          disabled={disabled}
        />
      )}
    </span>
  );
};
