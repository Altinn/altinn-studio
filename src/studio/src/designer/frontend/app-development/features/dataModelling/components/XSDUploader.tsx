import { TopToolbarButton } from '@altinn/schema-editor/index';
import { PopoverOrigin } from '@material-ui/core/Popover';
import * as React from 'react';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { FileSelector, AltinnSpinner } from 'app-shared/components';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { XSDUploadUrl } from 'utils/urlHelper';
import axios from 'axios';

interface IXSDUploaderProps {
  language: any;
  onXSDUploaded: (filename: string) => void;
}

const anchorOrigin: PopoverOrigin = {
  vertical: 'bottom',
  horizontal: 'left',
};

export default function XSDUploader({
  onXSDUploaded,
  language,
}: IXSDUploaderProps) {
  const [uploadButtonAnchor, setUploadButtonAnchor] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [errorText, setErrorText] = React.useState(null);

  const handleUploadClick = React.useCallback((event) => {
    setUploadButtonAnchor(event.currentTarget);
  }, []);

  const handleUploadCancel = React.useCallback(() => {
    setUploadButtonAnchor(null);
  }, []);

  const onUploading = React.useCallback(
    (formData: FormData, fileName: string) => {
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
            setUploadButtonAnchor(null);
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
    },
    [language, onXSDUploaded],
  );

  return (
    <>
      <TopToolbarButton
        faIcon='fa fa-upload'
        iconSize={38}
        onClick={handleUploadClick}
        hideText={true}
      >
        {getLanguageFromKey('app_data_modelling.upload_xsd', language)}
      </TopToolbarButton>
      {uploadButtonAnchor && (
        <AltinnPopoverSimple
          anchorEl={uploadButtonAnchor}
          handleClose={handleUploadCancel}
          anchorOrigin={anchorOrigin}
        >
          {uploading ? (
            <AltinnSpinner
              spinnerText={getLanguageFromKey(
                'app_data_modelling.uploading_xsd',
                language,
              )}
            />
          ) : (
            <FileSelector
              busy={uploading}
              language={language}
              submitHandler={onUploading}
              accept='.xsd'
              labelTextResource='app_data_modelling.select_xsd'
              formFileName='thefile'
            />
          )}
          {errorText && <p>{errorText}</p>}
        </AltinnPopoverSimple>
      )}
    </>
  );
}
