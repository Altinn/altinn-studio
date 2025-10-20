import React, { useState } from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import { StudioProperty } from '@studio/components';
import { PlusCircleIcon } from '@studio/icons';
import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import { useDisplayCropValues } from './useDisplayCropValues';
import { ImageUploadCard } from './ImageUploadCard.tsx/ImageUploadCard';
import type { ExternalCrop } from './ImageUploadTypes';

type ImageUploadComponentProps = {
  component: FormItem<ComponentType.ImageUpload>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const ImageUploadComponent = ({
  component,
  handleComponentChange,
  className,
}: ImageUploadComponentProps): React.ReactElement => {
  const [openCard, setOpenCard] = useState(false);
  const componentPropertyLabel = useComponentPropertyLabel();
  const cropValuesDisplayed = useDisplayCropValues(component.crop);

  if (!openCard) {
    return (
      <StudioProperty.Button
        onClick={() => setOpenCard(true)}
        className={className}
        icon={!cropValuesDisplayed && <PlusCircleIcon />}
        property={componentPropertyLabel('crop_shape')}
        value={cropValuesDisplayed}
      />
    );
  }

  const handleSaveChanges = (cropToBeSaved: ExternalCrop) => {
    handleComponentChange({
      ...component,
      crop: cropToBeSaved,
    });
  };

  return (
    <ImageUploadCard
      externalCrop={component?.crop}
      handleSaveChanges={handleSaveChanges}
      setOpenCard={setOpenCard}
    />
  );
};
