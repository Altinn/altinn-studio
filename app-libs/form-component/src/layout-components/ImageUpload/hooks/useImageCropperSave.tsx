import type React from 'react';

import {
  cropAreaPlacement,
  drawCropArea,
  getNewFileName,
  IMAGE_TYPE,
  imagePlacement,
} from '@app/form-component/layout-components/ImageUpload/imageUploadUtils';
import type {
  CropInternal,
  Position,
} from '@app/form-component/layout-components/ImageUpload/imageUploadUtils';

type UseImageCropperSaveProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  cropArea: CropInternal;
  zoom: number;
  position: Position;
  /** Commit the cropped image. Wired by the runtime wrapper to the attachment uploader. */
  onSave: (file: File) => void;
  setValidationErrors: (errors: string[] | null) => void;
};

export function useImageCropperSave({
  canvasRef,
  imageRef,
  cropArea,
  zoom,
  position,
  onSave,
  setValidationErrors,
}: UseImageCropperSaveProps) {
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

    const { imgX, imgY, scaledWidth, scaledHeight } = imagePlacement({
      canvas,
      img,
      zoom,
      position,
    });
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
      onSave(imageFile);
      setValidationErrors(null);
    }, IMAGE_TYPE);
  };
  return { handleSave };
}
