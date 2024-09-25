import React, { useRef } from 'react';
import { fileSelectorInputId } from '@studio/testing/testids';
import { StudioFileUploader, StudioParagraph, StudioSpinner } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAddImageMutation } from 'app-shared/hooks/mutations/useAddImageMutation';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { useTranslation } from 'react-i18next';
import { WWWROOT_FILE_PATH } from '../../../../EditImage/constants';
import classes from './UploadImage.module.css';

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

  return pendingUpload ? (
    <StudioSpinner spinnerTitle={t('general.loading')} />
  ) : (
    <div>
      <StudioFileUploader
        onUploadFile={handleUpload}
        accept='image/*'
        ref={imageUploaderRef}
        uploaderButtonText={t('ux_editor.properties_panel.images.upload_image')}
        customFileNameValidation={{
          validateFileName: (fileName: string) => isFileNameValid(fileName, imageFileNames),
          onInvalidFileName: handleOverrideExisingUploadedImage,
        }}
        dataTestId={fileSelectorInputId}
      />
      <StudioParagraph spacing size='xsmall' className={classes.fileSizeLimit}>
        {t('ux_editor.properties_panel.images.upload_image_file_size_limit')}
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
