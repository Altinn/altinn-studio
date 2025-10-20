import React, { useState } from 'react';
import { StudioCard, StudioDivider, StudioParagraph } from '@studio/components';
import type { ErrorProps, ExternalCrop, InternalCrop } from '../ImageUploadTypes';
import { getInitialValues, validateCrop } from '../ImageUploadUtils';
import classes from './ImageUploadCard.module.css';
import { ImageUploadSize } from './ImageUploadSize';
import { ImageUploadActions } from './ImageUploadActions';
import { ImageUploadShape } from './ImageUploadShape';
import { useTranslation } from 'react-i18next';

type ImageUploadCard = {
  externalCrop?: ExternalCrop;
  handleSaveChanges: (CropToBeSaved: ExternalCrop) => void;
  setOpenCard: (open: boolean) => void;
};

export const ImageUploadCard = ({
  externalCrop,
  handleSaveChanges,
  setOpenCard,
}: ImageUploadCard) => {
  const [internalCrop, setInternalCrop] = useState<InternalCrop>(getInitialValues(externalCrop));
  const [errors, setErrors] = useState<ErrorProps>({});
  const { t } = useTranslation();

  const handleNewCrop = (newCrop: InternalCrop) => {
    const validationErrors = validateCrop(newCrop);
    setErrors(validationErrors);
    setInternalCrop(newCrop);
  };

  return (
    <StudioCard className={classes.cardWrapper}>
      <StudioParagraph>Form og størrelse</StudioParagraph>
      <StudioDivider />
      <StudioParagraph className={classes.cardDescription}>
        {t('ux_editor.component_properties.crop_description')}
      </StudioParagraph>
      <ImageUploadShape internalCrop={internalCrop} handleNewCrop={handleNewCrop} />
      <ImageUploadSize handleNewCrop={handleNewCrop} internalCrop={internalCrop} errors={errors} />
      <ImageUploadActions
        internalCrop={internalCrop}
        externalCrop={externalCrop}
        errors={errors}
        setOpenCard={setOpenCard}
        handleSaveChanges={handleSaveChanges}
      />
    </StudioCard>
  );
};
