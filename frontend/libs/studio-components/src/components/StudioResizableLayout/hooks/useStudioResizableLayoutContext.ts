import { useContext } from 'react';
import { StudioResizableLayoutContext } from '../context/StudioResizableLayoutContext';

export const useStudioResizableLayoutContext = (index: number) => {
  const { containerSizes, orientation, resizeDelta, resizeTo, collapse } = useContext(
    StudioResizableLayoutContext,
  );
  const containerSize = containerSizes[index];
  return { containerSize, orientation, resizeDelta, resizeTo, collapse };
};
