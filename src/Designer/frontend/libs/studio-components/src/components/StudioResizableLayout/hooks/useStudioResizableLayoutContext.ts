import type { Dispatch, SetStateAction } from 'react';
import { useContext } from 'react';
import type { StudioResizableLayoutContextProps } from '../context/StudioResizableLayoutContext';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutContext } from '../context/StudioResizableLayoutContext';

interface useStudioResizableLayoutContextReturnType extends Omit<
  StudioResizableLayoutContextProps,
  'containerSizes'
> {
  containerSize: number;
}

const defaultResizeHandler: (index: number, size: number) => void = () => {};
const defaultSetIsResizing: Dispatch<SetStateAction<boolean>> = () => {};

export const useStudioResizableLayoutContext = (
  index: number,
): useStudioResizableLayoutContextReturnType => {
  const context = useContext(StudioResizableLayoutContext);

  const {
    containerSizes = [],
    orientation = 'horizontal' as StudioResizableOrientation,
    isResizing = false,
    resizeDelta = defaultResizeHandler,
    resizeTo = defaultResizeHandler,
    setIsResizing = defaultSetIsResizing,
  } = context ?? {};

  const containerSize = containerSizes[index] ?? 1;
  return { containerSize, orientation, isResizing, resizeDelta, resizeTo, setIsResizing };
};
