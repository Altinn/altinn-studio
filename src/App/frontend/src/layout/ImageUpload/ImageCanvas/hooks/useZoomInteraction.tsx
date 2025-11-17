import { useCallback, useEffect } from 'react';
import type React from 'react';

import { MAX_ZOOM } from 'src/layout/ImageUpload/imageUploadUtils';

interface UseZoomInteractionProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  zoom: number;
  minAllowedZoom: number;
  onZoomChange: (newZoom: number) => void;
}

export const useZoomInteraction = ({ canvasRef, zoom, minAllowedZoom, onZoomChange }: UseZoomInteractionProps) => {
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const zoomSensitivity = 0.001;
      const zoomFactor = 1 - e.deltaY * zoomSensitivity;
      const newZoom = Math.max(minAllowedZoom, Math.min(zoom * zoomFactor, MAX_ZOOM));
      onZoomChange(newZoom);
    },
    [zoom, onZoomChange, minAllowedZoom],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel, canvasRef]);
};
