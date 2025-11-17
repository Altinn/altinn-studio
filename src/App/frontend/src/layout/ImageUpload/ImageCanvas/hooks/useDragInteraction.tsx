import type React from 'react';

import type { Position } from 'src/layout/ImageUpload/imageUploadUtils';

type UseDragInteractionProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  position: Position;
  onPositionChange: (newPosition: Position) => void;
};

export const useDragInteraction = ({ canvasRef, position, onPositionChange }: UseDragInteractionProps) => {
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    const startDrag = { x: e.clientX - position.x, y: e.clientY - position.y };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      onPositionChange({
        x: moveEvent.clientX - startDrag.x,
        y: moveEvent.clientY - startDrag.y,
      });
    };

    const handlePointerUp = () => {
      canvas.releasePointerCapture(e.pointerId);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return { handlePointerDown };
};
