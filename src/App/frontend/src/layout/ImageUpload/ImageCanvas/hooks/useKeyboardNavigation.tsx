import { useCallback } from 'react';
import type React from 'react';

import type { Position } from 'src/layout/ImageUpload/imageUploadUtils';

type UseKeyboardNavigationProps = {
  position: Position;
  onPositionChange: (newPosition: Position) => void;
};

export const useKeyboardNavigation = ({ position, onPositionChange }: UseKeyboardNavigationProps) => {
  const MOVE_AMOUNT = 10;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const keyMap: Record<string, () => void> = {
        ArrowUp: () => onPositionChange({ ...position, y: position.y - MOVE_AMOUNT }),
        ArrowDown: () => onPositionChange({ ...position, y: position.y + MOVE_AMOUNT }),
        ArrowLeft: () => onPositionChange({ ...position, x: position.x - MOVE_AMOUNT }),
        ArrowRight: () => onPositionChange({ ...position, x: position.x + MOVE_AMOUNT }),
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        keyMap[e.key]();
      }
    },
    [position, onPositionChange],
  );

  return { handleKeyDown };
};
