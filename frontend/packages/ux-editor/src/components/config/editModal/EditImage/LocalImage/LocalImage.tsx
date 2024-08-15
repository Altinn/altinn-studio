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
  // Can we return null if the image source is not a file from app? Then we can check here if fileName is null and not use imageOriginsFromLibrary
  return !!fileName ? (
    <PreviewImageSummary
      existingImageUrl={fileName}
      existingImageDescription={null} // Null until we have a place to store descriptions
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
