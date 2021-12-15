import * as React from 'react';
import { TopToolbarButton } from '@altinn/schema-editor/index';
import { PopoverOrigin } from '@material-ui/core/Popover';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { FileSelector, AltinnSpinner } from 'app-shared/components';
import { getLanguageFromKey } from 'app-shared/utils/language';
import axios from 'axios';

export interface IXSDUploadProps {
  language: any;
  onXSDUploaded: (filename: string) => void;
  org: string;
  repo: string;
}

const anchorOrigin: PopoverOrigin = {
  vertical: 'bottom',
  horizontal: 'left',
};

const XSDUpload = ({ language, onXSDUploaded, org, repo }: IXSDUploadProps) => {
  const [uploadButtonAnchor, setUploadButtonAnchor] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [errorText, setErrorText] = React.useState(null);

  const handleUpload = (formData: FormData, fileName: string) => {
    const XSDUploadUrl = `${window.location.origin}/designer/${org}/${repo}/datamodels/upload`;
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
  };

  const handleUploadCancel = () => {
    setUploadButtonAnchor(null);
  };

  const handleUploadClick = (event: any) => {
    setUploadButtonAnchor(event.currentTarget);
  };

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
              submitHandler={handleUpload}
              accept='.xsd'
              labelTextResource='app_data_modelling.select_xsd'
              formFileName='thefile'
            />
          )}
          {errorText && <p data-test-id='errorText'>{errorText}</p>}
        </AltinnPopoverSimple>
      )}
    </>
  );
};

export default XSDUpload;
