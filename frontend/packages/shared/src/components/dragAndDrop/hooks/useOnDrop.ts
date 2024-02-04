import { DragAndDropRootContext } from 'app-shared/components/dragAndDrop/DragAndDropProvider';
import { useContext } from 'react';
import type { HandleDrop } from 'app-shared/types/dndTypes';

export function useOnDrop<T>(): HandleDrop<T> {
  const context = useContext(DragAndDropRootContext);
  if (!context) {
    throw new Error('useOnDrop must be used within a DragAndDropRootContext provider.');
  }
  return context.onDrop;
}
