import React from 'react';
import type { StudioButtonProps } from '@studio/components';
import { StudioFileUploader, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useUploadDataModelMutation } from '../../../../hooks/mutations/useUploadDataModelMutation';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { fileSelectorInputId } from '@studio/testing/testids';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';

export interface XSDUploadProps {
  selectedOption?: MetadataOption;
  uploadButtonText?: string;
  uploaderButtonVariant?: StudioButtonProps['variant'];
}

export const XSDUpload = ({
  selectedOption,
  uploadButtonText,
  uploaderButtonVariant,
}: XSDUploadProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { mutate: uploadDataModel, isPending: uploading } = useUploadDataModelMutation(
    selectedOption?.value?.repositoryRelativeUrl,
    {
      hideDefaultError: (error: AxiosError<ApiError>) => !error.response?.data?.errorCode,
    },
  );

  const uploadButton = React.useRef(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = (formData: FormData) => {
    uploadDataModel(formData, {
      onError: (error: AxiosError<ApiError>) => {
        if (!error.response?.data?.errorCode)
          toast.error(t('form_filler.file_uploader_validation_error_upload'));
      },
    });
  };

  const fileNameRegEx: RegExp = /^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/;

  const validateFileName = (fileName: string): boolean => {
    const nameFollowsRegexRules = Boolean(fileName.match(fileNameRegEx));
    if (!nameFollowsRegexRules) {
      toast.error(t('app_data_modelling.upload_xsd_invalid_error'));
      return false;
    }

    const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
    const duplicateDataType = Boolean(
      appMetadata.dataTypes?.find(
        (dataType) => dataType.id.toLowerCase() === fileNameWithoutExtension.toLowerCase(),
      ),
    );
    if (duplicateDataType) {
      toast.error(t('schema_editor.error_data_type_name_exists'));
      return false;
    }
    return true;
  };

  return (
    <span ref={uploadButton}>
      {uploading ? (
        <StudioSpinner spinnerTitle={t('app_data_modelling.uploading_xsd')} showSpinnerTitle />
      ) : (
        <StudioFileUploader
          onUploadFile={handleUpload}
          accept='.xsd'
          variant={uploaderButtonVariant}
          ref={fileInputRef}
          uploaderButtonText={uploadButtonText}
          customFileNameValidation={{
            validateFileName,
            onInvalidFileName: () => {},
          }}
          dataTestId={fileSelectorInputId}
        />
      )}
    </span>
  );
};

const fileNameRegEx: RegExp = /^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/;
const isFileNameMatchingRegEx = (fileName: string): boolean => !!fileName.match(fileNameRegEx);
