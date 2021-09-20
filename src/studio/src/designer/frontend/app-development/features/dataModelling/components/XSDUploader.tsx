import { TopToolbarButton } from '@altinn/schema-editor/index';
import * as React from 'react';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { FileSelector, AltinnSpinner } from 'app-shared/components';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { XSDUploadUrl } from 'utils/urlHelper';
import { FaFileUpload } from 'react-icons/fa';
import axios from 'axios';

interface IXSDUploaderProps {
  language: any,
  onXSDUploaded: (filename: string) => void,
}

export default function XSDUploader(props: IXSDUploaderProps) {
  const [uploadButtonAnchor, setUploadButtonAnchor] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [errorText, setErrorText] = React.useState(null);
  const onUploadClick = (event: any) => {
    setUploadButtonAnchor(event.currentTarget);
  };
  const onUploading = (formData: FormData, fileName: string) => {
    setUploading(true);
    axios.post(XSDUploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((response) => {
      if (response) {
        props.onXSDUploaded(fileName);
        setUploadButtonAnchor(null);
      }
    }).catch((error) => {
      if (error) {
        setErrorText(getLanguageFromKey('form_filler.file_uploader_validation_error_upload', props.language));
      }
    }).finally(() => setUploading(false));
  };
  const onUploadCancel = () => {
    setUploadButtonAnchor(null);
  };

  return (
    <>
      <TopToolbarButton
        startIcon={<FaFileUpload />}
        onClick={onUploadClick}
        hideText={true}
      >
        {getLanguageFromKey('app_data_modelling.upload_xsd', props.language)}
      </TopToolbarButton>
      {uploadButtonAnchor &&
        <AltinnPopoverSimple
          anchorEl={uploadButtonAnchor}
          handleClose={onUploadCancel}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          {uploading ? (
            <AltinnSpinner spinnerText={getLanguageFromKey('app_data_modelling.uploading_xsd', props.language)} />
          )
            : (
              <FileSelector
                busy={uploading}
                language={props.language}
                submitHandler={onUploading}
                accept='.xsd'
                labelTextResource='app_data_modelling.select_xsd'
                formFileName='thefile'
              />
            )
          }
          {errorText && <p>{errorText}</p>}
        </AltinnPopoverSimple>}
    </>
  );
}
