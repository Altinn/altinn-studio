import { useEffect } from 'react';
import type React from 'react';

import {
  cropAreaPlacement,
  type CropInternal,
  drawCropArea,
  imagePlacement,
  type Position,
} from 'src/layout/ImageUpload/imageUploadUtils';

type UseCanvasDrawProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  zoom: number;
  position: Position;
  cropArea: CropInternal;
};

export const useCanvasDraw = ({ canvasRef, imageRef, zoom, position, cropArea }: UseCanvasDrawProps) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !img?.complete || !ctx) {
      return;
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { imgX, imgY, scaledWidth, scaledHeight } = imagePlacement({ canvas, img, zoom, position });

      ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      const { cropAreaX, cropAreaY } = cropAreaPlacement({ canvas, cropArea });
      drawCropArea({ ctx, x: cropAreaX, y: cropAreaY, cropArea });
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
      ctx.restore();

      drawCropArea({ ctx, x: cropAreaX, y: cropAreaY, cropArea });
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (img.complete) {
      draw();
    } else {
      img.addEventListener('load', draw, { once: true });
    }

    return () => {
      img.removeEventListener('load', draw);
    };
  }, [canvasRef, imageRef, zoom, position, cropArea]);
};
