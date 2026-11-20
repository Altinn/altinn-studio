import type { Dispatch, SetStateAction } from 'react';
import { useRef, useCallback, useEffect } from 'react';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';

export const useStudioResizableLayoutMouseMovement = (
  orientation: StudioResizableOrientation,
  onMousePosChange: (delta: number) => void,
  onResizingChange: Dispatch<SetStateAction<boolean>>,
): {
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
} => {
  const lastMousePosition = useRef<number>(0);

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
      onResizingChange(false);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
    },
    [mouseMove, onResizingChange],
  );

  const onMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      if (event.button !== 0) return;
      event.preventDefault();
      onResizingChange(true);
      lastMousePosition.current = orientation === 'horizontal' ? event.clientX : event.clientY;
      window.addEventListener('mousemove', mouseMove);
      window.addEventListener('mouseup', mouseUp);
    },
    [mouseMove, mouseUp, orientation, onResizingChange],
  );

  return { onMouseDown };
};
