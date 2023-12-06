import React from 'react';
import { FileSelector } from 'app-shared/components';
import { StudioSpinner } from '@studio/components';
import axios from 'axios';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import { datamodelsUploadPath } from 'app-shared/api/paths';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export interface IXSDUploadProps {
  disabled?: boolean;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
}

export const XSDUpload = ({ disabled, submitButtonRenderer }: IXSDUploadProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const queryClient = useQueryClient();

  const [uploading, setUploading] = React.useState(false);
  const [errorText, setErrorText] = React.useState(null);

  const uploadButton = React.useRef(null);

  const handleUpload = (formData: FormData) => {
    setUploading(true);
    axios
      .post(datamodelsUploadPath(org, app), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        if (response) {
          setErrorText(null);
        }
      })
      .catch((error) => {
        if (error) {
          setErrorText(t('form_filler.file_uploader_validation_error_upload'));
        }
      })
      .finally(async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [QueryKey.DatamodelsJson, org, app],
          }),
          queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsXsd, org, app] }),
        ]);
        setUploading(false);
      });
  };

  return (
    <>
      <span ref={uploadButton}>
        {uploading ? (
          <StudioSpinner spinnerText={t('app_data_modelling.uploading_xsd')} />
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
