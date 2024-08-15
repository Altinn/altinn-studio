import type { FormEvent } from 'react';
import React, { useRef, useState } from 'react';
import { StudioButton } from '@studio/components';
import classes from './ImportImage.module.css';
import { useAddImageMutation } from 'app-shared/hooks/mutations/useAddImageMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { AddImageFromLibraryModal } from './AddImageFromLibrary/AddImageFromLibraryModal';
import { UploadImage } from './UploadImage/UploadImage';
import { useTranslation } from 'react-i18next';
import { OverrideExistingImageModal } from './OverrideExistingImageModal/OverrideExistingImageModal';
import { WWWROOT_FILE_PATH } from '../../../EditImage/EditImage';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';

interface ImportImageProps {
  onImageChange: (imageSource: string) => void;
}

export const ImportImage = ({ onImageChange }: ImportImageProps) => {
  const { t } = useTranslation();
  const [showChooseFromLibraryModalOpen, setShowChooseFromLibraryModalOpen] =
    useState<boolean>(false);
  const [showOverrideExistingImageModalOpen, setShowOverrideExistingImageModalOpen] =
    useState<boolean>(false);
  const imageRef = useRef(null);
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: uploadImage } = useAddImageMutation(org, app, true);

  const handleSubmit = async (
    event?: FormEvent<HTMLFormElement>,
    overrideExisting: boolean = false,
  ) => {
    event?.preventDefault();
    const imageFile = imageRef?.current?.files?.item(0);

    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      if (overrideExisting) {
        formData.append('overrideExisting', 'true');
      }
      uploadImage(formData, {
        onError: (error: AxiosError<ApiError>) =>
          error.response.data.errorCode === 'AD_04' && setShowOverrideExistingImageModalOpen(true),
        onSuccess: () => onImageChange(`${WWWROOT_FILE_PATH}${imageFile.name}`),
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
      {showOverrideExistingImageModalOpen && (
        <OverrideExistingImageModal
          isOpen={showOverrideExistingImageModalOpen}
          onClose={() => setShowOverrideExistingImageModalOpen(false)}
          onOverrideExisting={() => handleSubmit(undefined, true)}
        />
      )}
    </div>
  );
};
