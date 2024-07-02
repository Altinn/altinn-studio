import { useContext } from 'react';
import type { StudioResizableLayoutContextProps } from '../context/StudioResizableLayoutContext';
import { StudioResizableLayoutContext } from '../context/StudioResizableLayoutContext';

interface useStudioResizableLayoutContextReturnType
  extends Omit<StudioResizableLayoutContextProps, 'containerSizes'> {
  containerSize: number;
}

export const useStudioResizableLayoutContext = (
  index: number,
): useStudioResizableLayoutContextReturnType => {
  const { containerSizes, orientation, resizeDelta, resizeTo } = useContext(
    StudioResizableLayoutContext,
  );
  const containerSize = containerSizes[index];
  return { containerSize, orientation, resizeDelta, resizeTo };
};
