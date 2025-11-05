import type React from 'react';

import { useImageFile } from 'src/layout/ImageUpload/hooks/useImageFile';
import {
  cropAreaPlacement,
  drawCropArea,
  getNewFileName,
  IMAGE_TYPE,
  imagePlacement,
} from 'src/layout/ImageUpload/imageUploadUtils';
import type { CropInternal, Position } from 'src/layout/ImageUpload/imageUploadUtils';

type UseImageCropperSaveProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  cropArea: CropInternal;
  zoom: number;
  position: Position;
  baseComponentId: string;
  setValidationErrors: (errors: string[] | null) => void;
};

export function useImageCropperSave({
  canvasRef,
  imageRef,
  cropArea,
  zoom,
  position,
  baseComponentId,
  setValidationErrors,
}: UseImageCropperSaveProps) {
  const { saveImage } = useImageFile(baseComponentId);

  const handleSave = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');

    if (!canvas || !img || !cropCtx) {
      return;
    }

    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';

    cropCanvas.width = cropArea.width;
    cropCanvas.height = cropArea.height;

    const { imgX, imgY, scaledWidth, scaledHeight } = imagePlacement({ canvas, img, zoom, position });
    const { cropAreaX, cropAreaY } = cropAreaPlacement({ canvas, cropArea });

    drawCropArea({ ctx: cropCtx, cropArea });
    cropCtx.clip();
    cropCtx.drawImage(img, imgX - cropAreaX, imgY - cropAreaY, scaledWidth, scaledHeight);

    cropCanvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const newFileName = getNewFileName({ fileName: img.id });
      const imageFile = new File([blob], newFileName, { type: IMAGE_TYPE });
      saveImage(imageFile);
      setValidationErrors(null);
    }, IMAGE_TYPE);
  };
  return { handleSave };
}
