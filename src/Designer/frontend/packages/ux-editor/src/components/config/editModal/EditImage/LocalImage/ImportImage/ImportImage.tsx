import React, { useRef } from 'react';
import { StudioButton } from '@studio/components';
import classes from './ImportImage.module.css';
import { AddImageFromLibraryModal } from './AddImageFromLibrary/AddImageFromLibraryModal';
import { useTranslation } from 'react-i18next';
import { UploadImage } from './UploadImage/UploadImage';

interface ImportImageProps {
  onImageChange: (imageSource: string) => void;
}

export const ImportImage = ({ onImageChange }: ImportImageProps) => {
  const { t } = useTranslation();
  const libraryDialogRef = useRef<HTMLDialogElement>(null);

  const openLibraryDialog = () => {
    libraryDialogRef.current?.showModal();
  };

  return (
    <div className={classes.importImage}>
      <StudioButton onClick={openLibraryDialog}>
        {t('ux_editor.properties_panel.images.choose_from_library')}
      </StudioButton>
      <AddImageFromLibraryModal onAddImageReference={onImageChange} ref={libraryDialogRef} />
      <UploadImage onImageChange={onImageChange} />
    </div>
  );
};
