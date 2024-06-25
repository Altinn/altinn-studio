import { useContext } from 'react';
import { StudioResizableLayoutContext } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';

export const useStudioResizableLayoutContext = (index: number) => {
  const { containerSizes, orientation, resizeDelta, collapse } = useContext(
    StudioResizableLayoutContext,
  );
  const containerSize = containerSizes[index];
  return { containerSize, orientation, resizeDelta, collapse };
};
