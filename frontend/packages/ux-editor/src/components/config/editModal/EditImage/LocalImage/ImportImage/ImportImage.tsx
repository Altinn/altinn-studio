import type { FormEvent } from 'react';
import React, { useRef, useState } from 'react';
import { StudioButton } from '@studio/components';
import classes from './ImportImage.module.css';
import { useAddImageMutation } from 'app-shared/hooks/mutations/useAddImageMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { AddImageFromLibraryModal } from './AddImageFromLibrary/AddImageFromLibraryModal';
import { UploadImage } from './UploadImage/UploadImage';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { WWWROOT_FILE_PATH } from '../../RelativeImageSourceIdentifyer';

interface ImportImageProps {
  onImageChange: (imageSource: string) => void;
}

const CONFLICTING_IMAGE_FILE_NAME_API_ERROR_CODE = 'AD_04';

export const ImportImage = ({ onImageChange }: ImportImageProps) => {
  const { t } = useTranslation();
  const [showChooseFromLibraryModalOpen, setShowChooseFromLibraryModalOpen] =
    useState<boolean>(false);
  const imageRef = useRef(null);
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: uploadImage } = useAddImageMutation(org, app, true);

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const imageFile = imageRef?.current?.files?.item(0);

    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      uploadImage(formData, {
        onError: (error: AxiosError<ApiError>) =>
          error.response.data.errorCode === CONFLICTING_IMAGE_FILE_NAME_API_ERROR_CODE &&
          handleOverrideExisingUploadedImage(formData, imageFile.name),
        onSuccess: () => onImageChange(`${WWWROOT_FILE_PATH}${imageFile.name}`),
      });
    }
  };

  const handleOverrideExisingUploadedImage = (formData: FormData, imageFileName: string) => {
    const userConfirmed = window.confirm(
      t('ux_editor.properties_panel.images.override_existing_image_confirm_content'),
    );

    if (userConfirmed) {
      formData.append('overrideExisting', 'true');
      uploadImage(formData, {
        onSuccess: () => onImageChange(`${WWWROOT_FILE_PATH}${imageFileName}`),
      });
    }
  };

  const handleInputChange = async () => {
    const file = imageRef?.current?.files?.item(0);
    if (file) await handleSubmit();
  };

  return (
    <div className={classes.importImage}>
      <StudioButton size='small' onClick={() => setShowChooseFromLibraryModalOpen(true)}>
        {t('ux_editor.properties_panel.images.choose_from_library')}
      </StudioButton>
      {showChooseFromLibraryModalOpen && (
        <AddImageFromLibraryModal
          isOpen={showChooseFromLibraryModalOpen}
          onClose={() => setShowChooseFromLibraryModalOpen(false)}
          onAddImageReference={onImageChange}
        />
      )}
      <UploadImage
        onHandleSubmit={handleSubmit}
        onHandleInputChange={handleInputChange}
        imageRef={imageRef}
      />
    </div>
  );
};
