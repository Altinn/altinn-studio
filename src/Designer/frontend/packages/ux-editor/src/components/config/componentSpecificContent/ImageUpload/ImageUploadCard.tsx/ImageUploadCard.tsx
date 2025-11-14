import React, { useState } from 'react';
import { StudioConfigCard, StudioParagraph } from '@studio/components';
import type { ErrorProps, ExternalCrop, InternalCrop } from '../ImageUploadTypes';
import {
  getCropToBeSaved,
  getDisabledState,
  getInitialValues,
  validateCrop,
} from '../ImageUploadUtils';
import classes from './ImageUploadCard.module.css';
import { ImageUploadSize } from './ImageUploadSize';
import { ImageUploadShape } from './ImageUploadShape';
import { useTranslation } from 'react-i18next';

export type ImageUploadCardProps = {
  externalCrop?: ExternalCrop;
  handleSaveChanges: (CropToBeSaved: ExternalCrop) => void;
  setOpenCard: (open: boolean) => void;
};

export const ImageUploadCard = ({
  externalCrop,
  handleSaveChanges,
  setOpenCard,
}: ImageUploadCardProps) => {
  const [internalCrop, setInternalCrop] = useState<InternalCrop>(getInitialValues(externalCrop));
  const [errors, setErrors] = useState<ErrorProps>({});
  const { t } = useTranslation();
  const isSaveDisabled = getDisabledState({ errors, internalCrop, externalCrop });

  const handleNewCrop = (newCrop: InternalCrop) => {
    const validationErrors = validateCrop(newCrop);
    setErrors(validationErrors);
    setInternalCrop(newCrop);
  };

  const handleSave = () => {
    handleSaveChanges(getCropToBeSaved(internalCrop));
    setOpenCard(false);
  };

  const handleCancel = () => {
    setOpenCard(false);
  };

  const handleDelete = () => {
    handleSaveChanges(null);
    setOpenCard(false);
  };

  return (
    <StudioConfigCard className={classes.cardWrapper}>
      <StudioConfigCard.Header
        cardLabel={t('ux_editor.component_properties.crop_card.title')}
        deleteAriaLabel={t('general.delete')}
        confirmDeleteMessage={t('ux_editor.component_properties.crop_card.delete_confirm_message')}
        onDelete={handleDelete}
        isDeleteDisabled={!externalCrop}
      />

      <StudioConfigCard.Body>
        <StudioParagraph className={classes.cardDescription}>
          {t('ux_editor.component_properties.crop_description')}
        </StudioParagraph>
        <ImageUploadShape internalCrop={internalCrop} handleNewCrop={handleNewCrop} />
        <ImageUploadSize
          handleNewCrop={handleNewCrop}
          internalCrop={internalCrop}
          errors={errors}
        />
      </StudioConfigCard.Body>
      <StudioConfigCard.Footer
        isDisabled={isSaveDisabled}
        onSave={handleSave}
        onCancel={handleCancel}
        saveLabel={t('general.save')}
        cancelLabel={t('general.cancel')}
      />
    </StudioConfigCard>
  );
};
