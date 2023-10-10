import { useContext } from 'react';
import { DragAndDropRootContext } from 'app-shared/components/dragAndDrop/DragAndDropProvider';

export const useGapValue = (): string => {
  const context = useContext(DragAndDropRootContext);
  if (!context) {
    throw new Error('useGapValue must be used within a DragAndDropProvider.');
  }
  return context.gap;
};
