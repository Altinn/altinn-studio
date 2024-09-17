import React, { useRef } from 'react';
import { StudioButton, StudioFileUploader } from '@studio/components';
import classes from './ImportImage.module.css';
import { useAddImageMutation } from 'app-shared/hooks/mutations/useAddImageMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { AddImageFromLibraryModal } from './AddImageFromLibrary/AddImageFromLibraryModal';
import { useTranslation } from 'react-i18next';
import { WWWROOT_FILE_PATH } from '../../constants';
import { fileSelectorInputId } from '@studio/testing/testids';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';

interface ImportImageProps {
  onImageChange: (imageSource: string) => void;
}

export const ImportImage = ({ onImageChange }: ImportImageProps) => {
  const { t } = useTranslation();
  const libraryDialogRef = useRef<HTMLDialogElement>(null);
  const imageUploaderRef = useRef(null);
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: uploadImage } = useAddImageMutation(org, app, true);
  const { data: imageFileNames } = useGetAllImageFileNamesQuery(org, app);

  console.log('imageFileNames: ', imageFileNames);

  const openLibraryDialog = () => {
    libraryDialogRef.current?.showModal();
  };

  function handleSuccess(name: string): void {
    const filePath = makeFilePath(name);
    return onImageChange(filePath);
  }

  const handleUpload = async (formData: FormData, imageFileName: string) => {
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
      uploadImage(formData, {
        onSuccess: () => handleSuccess(imageFileName),
      });
    }
  };

  return (
    <div className={classes.importImage}>
      <StudioButton size='small' onClick={openLibraryDialog}>
        {t('ux_editor.properties_panel.images.choose_from_library')}
      </StudioButton>
      <AddImageFromLibraryModal onAddImageReference={onImageChange} ref={libraryDialogRef} />
      <StudioFileUploader
        onUploadFile={handleUpload}
        accept='image/*'
        ref={imageUploaderRef}
        uploaderButtonText={t('ux_editor.properties_panel.images.upload_image')}
        customFileNameValidation={{
          validateFileName: (fileName: string) => isFileNameInvalid(fileName, imageFileNames),
          onInvalidFileName: handleOverrideExisingUploadedImage,
        }}
        dataTestId={fileSelectorInputId}
      />
    </div>
  );
};

function makeFilePath(name: string): string {
  return `${WWWROOT_FILE_PATH}${name}`;
}

const isFileNameInvalid = (fileName: string, invalidFileNames: string[]): boolean => {
  return !invalidFileNames.includes(fileName);
};
