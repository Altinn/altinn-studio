import React, { MutableRefObject } from 'react';
import { AltinnSpinner, FileSelector } from 'app-shared/components';
import axios from 'axios';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import { datamodelsUploadPath } from 'app-shared/api/paths';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { removeExtension } from 'app-shared/utils/filenameUtils';

export interface IXSDUploadProps {
  disabled?: boolean;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
  uploadedOrCreatedFileName: MutableRefObject<string | null>;
}

export const XSDUpload = ({
  disabled,
  submitButtonRenderer,
  uploadedOrCreatedFileName,
}: IXSDUploadProps) => {
  const { t } = useTranslation();
  const { org, app } = useParams<{ org: string; app: string }>();

  const [uploading, setUploading] = React.useState(false);
  const [errorText, setErrorText] = React.useState(null);

  const uploadButton = React.useRef(null);

  const handleUpload = (formData: FormData, fileName: string) => {
    setUploading(true);
    axios
      .post(datamodelsUploadPath(org, app), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        if (response) {
          uploadedOrCreatedFileName.current = removeExtension(fileName);
          setErrorText(null);
        }
      })
      .catch((error) => {
        if (error) {
          setErrorText(t('form_filler.file_uploader_validation_error_upload'));
        }
      })
      .finally(() => setUploading(false));
  };

  return (
    <>
      <span ref={uploadButton}>
        {uploading ? (
          <AltinnSpinner spinnerText={t('app_data_modelling.uploading_xsd')} />
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
      {errorText && (
        <ErrorPopover
          anchorEl={uploadButton.current}
          onClose={() => setErrorText(null)}
          errorMessage={errorText}
        />
      )}
    </>
  );
};
