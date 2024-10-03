import React from 'react';
import { PreviewImageSummary } from './PreviewImageSummary';
import { ImportImage } from './ImportImage';
import { ConflictingImageSourceAlert } from '../ConflictingImageSourceAlert';

export interface LocalImageProps {
  componentHasExternalImageReference: boolean;
  fileName: string;
  onDeleteImage: (fileName: string) => void;
  onDeleteImageReferenceOnly: () => void;
  onImageChange: (fileName: string) => void;
}

export const LocalImage = ({
  componentHasExternalImageReference,
  fileName,
  onDeleteImage,
  onDeleteImageReferenceOnly,
  onImageChange,
}: LocalImageProps) => {
  return !!fileName ? (
    <PreviewImageSummary
      existingImageUrl={fileName}
      onDeleteImage={onDeleteImage}
      onDeleteImageReferenceOnly={onDeleteImageReferenceOnly}
    />
  ) : (
    <>
      <ImportImage onImageChange={onImageChange} />
      <ConflictingImageSourceAlert
        showAlert={componentHasExternalImageReference}
        conflictSource={'relative'}
      />
    </>
  );
};
