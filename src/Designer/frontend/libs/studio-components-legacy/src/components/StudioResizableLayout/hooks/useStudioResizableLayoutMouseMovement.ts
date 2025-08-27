import { useRef, useCallback, useState, useEffect } from 'react';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';

export const useStudioResizableLayoutMouseMovement = (
  orientation: StudioResizableOrientation,
  onMousePosChange: (delta: number) => void,
): {
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => () => void;
  isResizing: boolean;
} => {
  const lastMousePosition = useRef<number>(0);
  const [isResizing, setIsResizing] = useState(false);

  // throttle mouseMove events to avoid calculating new size before last rerender
  const update = useRef<number>(1);
  const lastEventUpdate = useRef<number>(0);
  useEffect(() => {
    update.current++;
  });

  const mouseMove = useCallback(
    (event: MouseEvent): void => {
      if (update.current === lastEventUpdate.current) return;
      lastEventUpdate.current = update.current;
      const mousePos = orientation === 'horizontal' ? event.clientX : event.clientY;
      const mouseDelta = mousePos - lastMousePosition.current;
      onMousePosChange(mouseDelta);
      lastMousePosition.current = mousePos;
    },
    [orientation, onMousePosChange],
  );

  const mouseUp = useCallback(
    (_: MouseEvent): void => {
      update.current = 1;
      lastEventUpdate.current = 0;
      setIsResizing(false);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
    },
    [mouseMove],
  );

  const onMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): (() => void) => {
      if (event.button !== 0) return;
      event.preventDefault();
      setIsResizing(true);
      lastMousePosition.current = orientation === 'horizontal' ? event.clientX : event.clientY;
      window.addEventListener('mousemove', mouseMove);
      window.addEventListener('mouseup', mouseUp);
    },
    [mouseMove, mouseUp, orientation],
  );

  return { onMouseDown, isResizing };
};
