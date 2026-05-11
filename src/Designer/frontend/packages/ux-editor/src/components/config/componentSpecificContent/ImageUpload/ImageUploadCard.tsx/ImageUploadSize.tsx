import React from 'react';
import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import type { ErrorProps, InternalCrop } from '../ImageUploadTypes';
import { isRectangleShape, SizeOptions } from '../ImageUploadUtils';
import { StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type ImageUploadSizeProps = {
  internalCrop: InternalCrop;
  errors: ErrorProps;
  handleNewCrop: (newInternalCrop: InternalCrop) => void;
};

export const ImageUploadSize = ({
  internalCrop,
  errors,
  handleNewCrop,
}: ImageUploadSizeProps): React.ReactElement => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const { t } = useTranslation();

  const handleSizeChange = (key: SizeOptions) => (value?: number) => {
    const newCrop = { ...internalCrop, [key]: value };
    handleNewCrop(newCrop);
  };

  if (isRectangleShape(internalCrop)) {
    return (
      <>
        <StudioTextfield
          label={componentPropertyLabel('crop_width')}
          value={internalCrop.width}
          type='number'
          onChange={(e) => handleSizeChange(SizeOptions.Width)(e.target.valueAsNumber)}
          error={t(errors.width)}
        />
        <StudioTextfield
          label={componentPropertyLabel('crop_height')}
          value={internalCrop.height}
          type='number'
          onChange={(e) => handleSizeChange(SizeOptions.Height)(e.target.valueAsNumber)}
          error={t(errors.height)}
        />
      </>
    );
  }

  return (
    <StudioTextfield
      label={componentPropertyLabel('crop_diameter')}
      value={internalCrop.diameter}
      type='number'
      onChange={(e) => handleSizeChange(SizeOptions.Diameter)(e.target.valueAsNumber)}
      error={t(errors.diameter)}
    />
  );
};
