import React, { useCallback, useRef, useState } from 'react';

import { ValidationMessage } from '@digdir/designsystemet-react';

import { AppCard } from 'src/app-components/Card/Card';
import { Lang } from 'src/features/language/Lang';
import { useImageCropperSave } from 'src/layout/ImageUpload/hooks/useImageCropperSave';
import { useImageFile } from 'src/layout/ImageUpload/hooks/useImageFile';
import { useImageUploader } from 'src/layout/ImageUpload/hooks/useImageUploader';
import { ImageCanvas } from 'src/layout/ImageUpload/ImageCanvas/ImageCanvas';
import { ImageControllers } from 'src/layout/ImageUpload/ImageControllers';
import { ImageDropzone } from 'src/layout/ImageUpload/ImageDropzone';
import {
  calculateMinZoom,
  calculatePositionForZoom,
  IMAGE_TYPE,
  MAX_ZOOM,
} from 'src/layout/ImageUpload/imageUploadUtils';
import type { CropInternal, Position } from 'src/layout/ImageUpload/imageUploadUtils';

interface ImageCropperProps {
  baseComponentId: string;
  cropArea: CropInternal;
  readOnly: boolean;
}

export function ImageCropper({ baseComponentId, cropArea, readOnly }: ImageCropperProps) {
  const { deleteImage, storedImage } = useImageFile(baseComponentId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageTypeRef = useRef<string | null>(null);
  const [zoom, setZoom] = useState<number>(0);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const { handleSave } = useImageCropperSave({
    canvasRef,
    imageRef,
    cropArea,
    zoom,
    position,
    baseComponentId,
    setValidationErrors,
  });

  type UpdateImageState = { minZoom?: number; img?: HTMLImageElement | null };
  const updateImageState = ({ minZoom = minAllowedZoom, img = imageRef.current }: UpdateImageState) => {
    setZoom(minZoom);
    setPosition({ x: 0, y: 0 });
    imageRef.current = img;
  };

  const { handleFileUpload } = useImageUploader({ cropArea, updateImageState, setValidationErrors, imageTypeRef });
  const minAllowedZoom = imageRef.current ? calculateMinZoom({ img: imageRef.current, cropArea }) : 0.1;

  const handleZoomChange = useCallback(
    (newZoomValue: number) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;

      if (!canvas || !img) {
        return;
      }

      const newZoom = Math.max(minAllowedZoom, Math.min(newZoomValue, MAX_ZOOM));
      const newPosition = calculatePositionForZoom({ canvas, img, oldZoom: zoom, newZoom, position, cropArea });
      setZoom(newZoom);
      setPosition(newPosition);
    },
    [minAllowedZoom, position, zoom, cropArea],
  );

  const handleDeleteImage = () => {
    deleteImage();
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
          baseComponentId={baseComponentId}
          onDrop={(files) => handleFileUpload(files[0])}
          readOnly={readOnly}
          hasErrors={!!validationErrors && validationErrors?.length > 0}
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
          baseComponentId={baseComponentId}
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
  if (!validationErrors) {
    return null;
  }

  return validationErrors.map((error, index) => (
    <ValidationMessage
      key={`error-${index}`}
      data-size='sm'
    >
      <Lang id={error} />
    </ValidationMessage>
  ));
};
