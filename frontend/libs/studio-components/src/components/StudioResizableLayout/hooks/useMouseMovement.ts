import { useRef, useCallback, useState } from 'react';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';

export const useMouseMovement = (
  orientation: StudioResizableOrientation,
  onMousePosChange: (delta: number) => void,
): {
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => () => void;
  isResizing: boolean;
} => {
  const lastMousePosition = useRef<number>(0);
  const [isResizing, setIsResizing] = useState(false);

  const mouseMove = useCallback(
    (event: MouseEvent) => {
      const mousePos = orientation === 'horizontal' ? event.pageX : event.pageY;
      const mouseDelta = mousePos - lastMousePosition.current;
      onMousePosChange(mouseDelta);
      lastMousePosition.current = mousePos;
    },
    [orientation, onMousePosChange],
  );

  const mouseUp = useCallback(
    (_: MouseEvent) => {
      setIsResizing(false);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
    },
    [mouseMove],
  );

  const onMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsResizing(true);
      lastMousePosition.current = orientation === 'horizontal' ? event.pageX : event.pageY;
      window.addEventListener('mousemove', mouseMove);
      window.addEventListener('mouseup', mouseUp);

      return () => {
        window.removeEventListener('mousemove', mouseMove);
        window.removeEventListener('mouseup', mouseUp);
      };
    },
    [mouseMove, mouseUp, orientation],
  );

  return { onMouseDown, isResizing };
};
