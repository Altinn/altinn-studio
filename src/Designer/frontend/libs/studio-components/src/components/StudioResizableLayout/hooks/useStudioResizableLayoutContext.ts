import { useContext } from 'react';
import type { StudioResizableLayoutContextProps } from '../context/StudioResizableLayoutContext';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutContext } from '../context/StudioResizableLayoutContext';

interface useStudioResizableLayoutContextReturnType
  extends Omit<StudioResizableLayoutContextProps, 'containerSizes'> {
  containerSize: number;
}

export const useStudioResizableLayoutContext = (
  index: number,
): useStudioResizableLayoutContextReturnType => {
  const context = useContext(StudioResizableLayoutContext);

  const defaultResizeHandler: (index: number, size: number) => void = () => {};
  const {
    containerSizes = [],
    orientation = 'horizontal' as StudioResizableOrientation,
    resizeDelta = defaultResizeHandler,
    resizeTo = defaultResizeHandler,
  } = context ?? {};

  const containerSize = containerSizes[index] ?? 1;
  return { containerSize, orientation, resizeDelta, resizeTo };
};
