import { Grid, Button } from '@material-ui/core';
import { CloudUploadOutlined } from '@material-ui/icons';
import * as React from 'react';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { XSDUploadUrl } from 'utils/urlHelper';
import axios from 'axios';
import FileInput from './FileInput';

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
  const onUploading = (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('thefile', file);
    const url = XSDUploadUrl;
    axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }).then((response) => {
      if (response) {
        props.onXSDUploaded(file.name);
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
      <Grid item>
        <Button
          id='upload-button'
          variant='contained'
          className='button'
          startIcon={<CloudUploadOutlined />}
          onClick={onUploadClick}
        >
          {getLanguageFromKey('general.upload_xsd', props.language)}
        </Button>
      </Grid>
      {uploadButtonAnchor &&
        <AltinnPopoverSimple
          anchorEl={uploadButtonAnchor}
          handleClose={onUploadCancel}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <FileInput busy={uploading} language={props.language} submitHandler={onUploading} />
          {errorText && <p>{errorText}</p>}
        </AltinnPopoverSimple>}
    </>
  );
}
