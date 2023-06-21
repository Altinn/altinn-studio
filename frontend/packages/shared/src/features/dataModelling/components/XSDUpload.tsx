import React from 'react';
import { AltinnSpinner, FileSelector } from '../../../components';
import axios from 'axios';
import ErrorPopover from '../../../components/ErrorPopover';
import { datamodelsUploadPath } from '../../../api/paths';
import { useTranslation } from 'react-i18next';

export interface IXSDUploadProps {
  disabled?: boolean;
  onXSDUploaded: (filename: string) => void;
  org: string;
  repo: string;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
}

export const XSDUpload = ({
  disabled,
  onXSDUploaded,
  org,
  repo,
  submitButtonRenderer,
}: IXSDUploadProps) => {
  const { t } = useTranslation();

  const [uploading, setUploading] = React.useState(false);
  const [errorText, setErrorText] = React.useState(null);

  const uploadButton = React.useRef(null);

  const handleUpload = (formData: FormData, fileName: string) => {
    setUploading(true);
    axios
      .post(datamodelsUploadPath(org, repo), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        if (response) {
          onXSDUploaded(fileName);
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
