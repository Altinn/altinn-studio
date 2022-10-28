import React from 'react';
import { AltinnSpinner, FileSelector } from '../../../components';
import { getLanguageFromKey } from '../../../utils/language';
import axios from 'axios';
import ErrorPopover from '../../../components/ErrorPopover';

export interface IXSDUploadProps {
  disabled?: boolean;
  language: any;
  onXSDUploaded: (filename: string) => void;
  org: string;
  repo: string;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
}

export const XSDUpload = ({ disabled, language, onXSDUploaded, org, repo, submitButtonRenderer }: IXSDUploadProps) => {
  const [uploading, setUploading] = React.useState(false);
  const [errorText, setErrorText] = React.useState(null);

  const uploadButton = React.useRef(null);

  const handleUpload = (formData: FormData, fileName: string) => {
    const XSDUploadUrl = `${window.location.origin}/designer/api/${org}/${repo}/datamodels/upload`;
    setUploading(true);
    axios
      .post(XSDUploadUrl, formData, {
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
          setErrorText(getLanguageFromKey('form_filler.file_uploader_validation_error_upload', language));
        }
      })
      .finally(() => setUploading(false));
  };

  return (
    <>
      <span ref={uploadButton}>
        {uploading ? (
          <AltinnSpinner spinnerText={getLanguageFromKey('app_data_modelling.uploading_xsd', language)} />
        ) : (
          <FileSelector
            busy={false}
            language={language}
            submitHandler={handleUpload}
            accept='.xsd'
            formFileName='file'
            submitButtonRenderer={submitButtonRenderer}
            disabled={disabled}
          />
        )}
      </span>
      {errorText && (
        <ErrorPopover anchorEl={uploadButton.current} onClose={() => setErrorText(null)} errorMessage={errorText} />
      )}
    </>
  );
};
