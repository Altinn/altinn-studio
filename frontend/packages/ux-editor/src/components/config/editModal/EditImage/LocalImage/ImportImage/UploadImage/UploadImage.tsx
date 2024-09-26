import React, { useRef } from 'react';
import { fileSelectorInputId } from '@studio/testing/testids';
import { StudioFileUploader, StudioParagraph, StudioSpinner } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAddImageMutation } from 'app-shared/hooks/mutations/useAddImageMutation';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { useTranslation } from 'react-i18next';
import { MAX_FILE_SIZE_MB, WWWROOT_FILE_PATH } from '../../../../EditImage/constants';
import classes from './UploadImage.module.css';
import { toast } from 'react-toastify';

type UploadImageProps = {
  onImageChange: (filePath: string) => void;
};
export const UploadImage = ({ onImageChange }: UploadImageProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: uploadImage, isPending: pendingUpload } = useAddImageMutation(org, app);
  const { data: imageFileNames } = useGetAllImageFileNamesQuery(org, app);
  const { t } = useTranslation();
  const imageUploaderRef = useRef(null);

  function handleSuccess(name: string): void {
    const filePath = makeFilePath(name);
    return onImageChange(filePath);
  }

  const handleUpload = (formData: FormData, imageFileName: string) => {
    uploadImage(formData, {
      onSuccess: () => handleSuccess(imageFileName),
    });
  };

  const handleOverrideExisingUploadedImage = (formData: FormData, imageFileName: string) => {
    const userConfirmed = window.confirm(
      t('ux_editor.properties_panel.images.override_existing_image_confirm_content'),
    );

    if (userConfirmed) {
      formData.append('overrideExisting', 'true');
      handleUpload(formData, imageFileName);
    }
  };

  const handleInvalidFileSize = () =>
    toast.error(
      t('ux_editor.properties_panel.images.file_size_exceeds_limit', {
        maxSize: MAX_FILE_SIZE_MB,
      }),
    );

  return pendingUpload ? (
    <StudioSpinner spinnerTitle={t('general.loading')} />
  ) : (
    <div>
      <StudioFileUploader
        onUploadFile={handleUpload}
        accept='image/*'
        ref={imageUploaderRef}
        uploaderButtonText={t('ux_editor.properties_panel.images.upload_image')}
        customFileValidation={{
          validateFileName: (fileName: string) => isFileNameValid(fileName, imageFileNames),
          onInvalidFileName: handleOverrideExisingUploadedImage,
          fileSizeLimitMb: MAX_FILE_SIZE_MB,
          onInvalidFileSize: handleInvalidFileSize,
        }}
        dataTestId={fileSelectorInputId}
      />
      <StudioParagraph spacing size='xsmall' className={classes.fileSizeLimit}>
        {t('ux_editor.properties_panel.images.upload_image_file_size_limit', {
          maxSize: MAX_FILE_SIZE_MB,
        })}
      </StudioParagraph>
    </div>
  );
};

function makeFilePath(name: string): string {
  return `${WWWROOT_FILE_PATH}${name}`;
}

const isFileNameValid = (fileName: string, invalidFileNames: string[]): boolean => {
  return !invalidFileNames.includes(fileName);
};
