import React, { useCallback } from 'react';

import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { useCanvasDraw } from '@app/form-component/layout-components/ImageUpload/ImageCanvas/hooks/useCanvasDraw';
import { useDragInteraction } from '@app/form-component/layout-components/ImageUpload/ImageCanvas/hooks/useDragInteraction';
import { useKeyboardNavigation } from '@app/form-component/layout-components/ImageUpload/ImageCanvas/hooks/useKeyboardNavigation';
import { useZoomInteraction } from '@app/form-component/layout-components/ImageUpload/ImageCanvas/hooks/useZoomInteraction';
import { ImagePreview } from '@app/form-component/layout-components/ImageUpload/ImageCanvas/ImagePreview';
import {
  constrainToArea,
  type CropInternal,
  type Position,
  type StoredImage,
} from '@app/form-component/layout-components/ImageUpload/imageUploadUtils';

import classes from './ImageCanvas.module.css';

interface ImageCanvasProps {
  imageRef: React.RefObject<HTMLImageElement | null>;
  zoom: number;
  minAllowedZoom: number;
  position: Position;
  cropArea: CropInternal;
  storedImage?: StoredImage;
  imageUrl?: string;
  setPosition: (newPosition: Position) => void;
  onZoomChange: (newZoom: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const CANVAS_HEIGHT = 320;
const CANVAS_WIDTH = 1000;

export function ImageCanvas({
  imageRef,
  zoom,
  minAllowedZoom,
  position,
  cropArea,
  storedImage,
  imageUrl,
  setPosition,
  onZoomChange,
  canvasRef,
}: ImageCanvasProps) {
  const { langAsString } = useTranslation();

  const handlePositionChange = useCallback(
    (newPosition: Position) => {
      if (!imageRef.current) {
        return;
      }
      setPosition(
        constrainToArea({
          image: imageRef.current,
          zoom,
          position: newPosition,
          cropArea,
        }),
      );
    },
    [zoom, cropArea, setPosition, imageRef],
  );

  useCanvasDraw({ canvasRef, imageRef, zoom, position, cropArea });
  useZoomInteraction({ canvasRef, zoom, minAllowedZoom, onZoomChange });
  const { handlePointerDown } = useDragInteraction({
    canvasRef,
    position,
    onPositionChange: handlePositionChange,
  });
  const { handleKeyDown } = useKeyboardNavigation({
    position,
    onPositionChange: handlePositionChange,
  });

  if (storedImage) {
    return <ImagePreview storedImage={storedImage} imageUrl={imageUrl} />;
  }

  return (
    <canvas
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={canvasRef}
      height={CANVAS_HEIGHT}
      width={CANVAS_WIDTH}
      className={classes.canvas}
      aria-label={langAsString('image_upload_component.crop_area')}
    />
  );
}
