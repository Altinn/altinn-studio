import React from 'react';
import { FileSelector, AltinnSpinner } from 'app-shared/components';
import { getLanguageFromKey } from 'app-shared/utils/language';
import axios from 'axios';
import ErrorPopover from "app-shared/components/ErrorPopover";

export interface IXSDUploadProps {
  language: any;
  onXSDUploaded: (filename: string) => void;
  org: string;
  repo: string;
  submitButtonRenderer?: ((fileInputClickHandler: (event: any) => void) => JSX.Element);
}

const XSDUpload = ({
  language,
  onXSDUploaded,
  org,
  repo,
  submitButtonRenderer
}: IXSDUploadProps) => {
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
          setErrorText(
            getLanguageFromKey(
              'form_filler.file_uploader_validation_error_upload',
              language,
            ),
          );
        }
      })
      .finally(() => setUploading(false));
  };

  return (
    <>
      <span ref={uploadButton}>
        {uploading ? (
          <AltinnSpinner
            spinnerText={getLanguageFromKey(
              'app_data_modelling.uploading_xsd',
              language,
            )}
          />
        ) : (
          <FileSelector
            busy={false}
            language={language}
            submitHandler={handleUpload}
            accept='.xsd'
            formFileName='file'
            submitButtonRenderer={submitButtonRenderer}
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

export default XSDUpload;
