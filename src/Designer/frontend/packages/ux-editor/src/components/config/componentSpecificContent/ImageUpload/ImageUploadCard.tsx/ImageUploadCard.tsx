import React, { useState } from 'react';
import { StudioCard, StudioDivider, StudioParagraph } from '@studio/components';
import type { ErrorProps, Crop, CropValues } from '../ImageUploadTypes';
import { getInitialValues, validateCrop } from '../ImageUploadUtils';
import classes from './ImageUploadCard.module.css';
import { ImageUploadSize } from './ImageUploadSize';
import { ImageUploadActions } from './ImageUploadActions';
import { ImageUploadShape } from './ImageUploadShape';
import { useTranslation } from 'react-i18next';

type ImageUploadCard = {
  initialCrop?: Crop;
  handleSaveChanges: (tempCrop: Crop) => void;
  setOpenCard: (open: boolean) => void;
};

export const ImageUploadCard = ({
  initialCrop,
  handleSaveChanges,
  setOpenCard,
}: ImageUploadCard) => {
  const [tempCrop, setTempCrop] = useState<CropValues>(getInitialValues(initialCrop));
  const [errors, setErrors] = useState<ErrorProps>({});
  const { t } = useTranslation();

  const handleNewCrop = (newCrop: Crop) => {
    const validationErrors = validateCrop({ newCrop, initialCrop });
    setErrors(validationErrors);
    setTempCrop(newCrop);
  };

  return (
    <StudioCard className={classes.cardWrapper}>
      <StudioParagraph>Form og størrelse</StudioParagraph>
      <StudioDivider />
      <StudioParagraph className={classes.cardDescription}>
        {t('ux_editor.component_properties.crop_description')}
      </StudioParagraph>
      <ImageUploadShape tempCrop={tempCrop} handleNewCrop={handleNewCrop} />
      <ImageUploadSize handleNewCrop={handleNewCrop} tempCrop={tempCrop} errors={errors} />
      <ImageUploadActions
        tempCrop={tempCrop}
        initialCrop={initialCrop}
        errors={errors}
        setOpenCard={setOpenCard}
        handleSaveChanges={handleSaveChanges}
      />
    </StudioCard>
  );
};
