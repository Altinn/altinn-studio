import { Button } from '@material-ui/core';
import { CloudUploadOutlined } from '@material-ui/icons';
import * as React from 'react';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { FileSelector, AltinnSpinner } from 'app-shared/components';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { XSDUploadUrl } from 'utils/urlHelper';
import axios from 'axios';

interface IXSDUploaderWrapper {
  language: any,
  onXSDUploaded: (filename: string) => void,
}

export default function XSDUploaderWrapper(props: IXSDUploaderWrapper) {
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
        setErrorText('Something went wrong. Please try again.');
      }
    }).finally(() => setUploading(false));
  };
  const onUploadCancel = () => {
    setUploadButtonAnchor(null);
  };

  return (
    <>
      <Button
        id='upload-button'
        variant='contained'
        className='button'
        startIcon={<CloudUploadOutlined />}
        onClick={onUploadClick}
      >
        {getLanguageFromKey('app_data_modelling.upload_xsd', props.language)}
      </Button>
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
                labelTextRecource='app_data_modelling.select_xsd'
                formFileName='thefile'
              />
            )
          }
          {errorText && <p>{errorText}</p>}
        </AltinnPopoverSimple>}
    </>
  );
}
