import { useCallback, useRef, useState } from 'react';

import { AppCard } from '@app/form-component/app-components/Card';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { useFocusOnChange } from '@app/form-component/layout-components/ImageUpload/hooks/useFocusOnChange';
import { useFocusWhenRemoved } from '@app/form-component/layout-components/ImageUpload/hooks/useFocusWhenRemoved';
import { useImageCropperSave } from '@app/form-component/layout-components/ImageUpload/hooks/useImageCropperSave';
import { useImageUploader } from '@app/form-component/layout-components/ImageUpload/hooks/useImageUploader';
import { ImageCanvas } from '@app/form-component/layout-components/ImageUpload/ImageCanvas/ImageCanvas';
import { ImageControllers } from '@app/form-component/layout-components/ImageUpload/ImageControllers';
import { ImageDropzone } from '@app/form-component/layout-components/ImageUpload/ImageDropzone';
import {
  calculateMinZoom,
  calculatePositionForZoom,
  IMAGE_TYPE,
  MAX_ZOOM,
} from '@app/form-component/layout-components/ImageUpload/imageUploadUtils';
import { ValidationMessage } from '@digdir/designsystemet-react';
import type {
  CropInternal,
  Position,
  StoredImage,
} from '@app/form-component/layout-components/ImageUpload/imageUploadUtils';

export interface ImageCropperProps {
  componentId: string;
  cropArea: CropInternal;
  readOnly: boolean;
  storedImage?: StoredImage;
  imageUrl?: string;
  onSave: (file: File) => void;
  onDelete: () => void;
}

export function ImageCropper({
  componentId,
  cropArea,
  readOnly,
  storedImage,
  imageUrl,
  onSave,
  onDelete,
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageTypeRef = useRef<string | null>(null);
  const dropzoneInputRef = useRef<HTMLInputElement | null>(null);
  const [zoom, setZoom] = useState<number>(0);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const { handleSave } = useImageCropperSave({
    canvasRef,
    imageRef,
    cropArea,
    zoom,
    position,
    onSave,
    setValidationErrors,
  });

  // Focus canvas when a new image is loaded
  useFocusOnChange(imageRef.current, canvasRef);

  // Focus dropzone when image is deleted/cancelled
  const currentImage = imageRef.current || storedImage;
  useFocusWhenRemoved(currentImage, dropzoneInputRef);

  type UpdateImageState = { minZoom?: number; img?: HTMLImageElement | null };
  const updateImageState = ({
    minZoom = minAllowedZoom,
    img = imageRef.current,
  }: UpdateImageState) => {
    setZoom(minZoom);
    setPosition({ x: 0, y: 0 });
    imageRef.current = img;
  };

  const { handleFileUpload } = useImageUploader({
    cropArea,
    updateImageState,
    setValidationErrors,
    imageTypeRef,
  });
  const minAllowedZoom = imageRef.current
    ? calculateMinZoom({ img: imageRef.current, cropArea })
    : 0.1;

  const handleZoomChange = useCallback(
    (newZoomValue: number) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;

      if (!canvas || !img) {
        return;
      }

      const newZoom = Math.max(minAllowedZoom, Math.min(newZoomValue, MAX_ZOOM));
      const newPosition = calculatePositionForZoom({
        canvas,
        img,
        oldZoom: zoom,
        newZoom,
        position,
        cropArea,
      });
      setZoom(newZoom);
      setPosition(newPosition);
    },
    [minAllowedZoom, position, zoom, cropArea],
  );

  const handleDeleteImage = () => {
    onDelete();
    updateImageState({ img: null });
  };

  const handleCancel = () => {
    setValidationErrors(null);
    updateImageState({ img: null });
  };

  if (!imageRef.current && !storedImage) {
    return (
      <>
        <ImageDropzone
          componentId={componentId}
          onDrop={(files) => handleFileUpload(files[0])}
          readOnly={readOnly}
          hasErrors={!!validationErrors && validationErrors?.length > 0}
          dropzoneInputRef={dropzoneInputRef}
        />
        <ValidationMessages validationErrors={validationErrors} />
      </>
    );
  }

  return (
    <AppCard
      variant='default'
      mediaPosition='top'
      media={
        <ImageCanvas
          canvasRef={canvasRef}
          imageRef={imageRef}
          zoom={zoom}
          minAllowedZoom={minAllowedZoom}
          position={position}
          cropArea={cropArea}
          storedImage={storedImage}
          imageUrl={imageUrl}
          setPosition={setPosition}
          onZoomChange={handleZoomChange}
        />
      }
    >
      {(imageRef.current || storedImage) && (
        <ImageControllers
          imageType={imageTypeRef.current ?? IMAGE_TYPE}
          readOnly={readOnly}
          zoom={zoom}
          zoomLimits={{ minZoom: minAllowedZoom, maxZoom: MAX_ZOOM }}
          storedImage={storedImage}
          updateZoom={handleZoomChange}
          onSave={handleSave}
          onDelete={handleDeleteImage}
          onCancel={handleCancel}
          onFileUploaded={handleFileUpload}
          onReset={() => updateImageState({})}
        />
      )}
      <ValidationMessages validationErrors={validationErrors} />
    </AppCard>
  );
}

const ValidationMessages = ({ validationErrors }: { validationErrors: string[] | null }) => {
  const { lang } = useTranslation();

  if (!validationErrors) {
    return null;
  }

  return validationErrors.map((error, index) => (
    <ValidationMessage key={`error-${index}`} data-size='sm'>
      {lang(error)}
    </ValidationMessage>
  ));
};
