import { useContext } from 'react';
import { StudioDragAndDropRootContext } from '../StudioDragAndDropProvider';

export const useGapValue = (): string => {
  const context = useContext(StudioDragAndDropRootContext);
  if (!context) {
    throw new Error('useGapValue must be used within a DragAndDropProvider.');
  }
  return context.gap;
};
