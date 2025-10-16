import { StudioDragAndDropRootContext } from '../StudioDragAndDropProvider';
import { useContext } from 'react';
import type { HandleDrop } from '../types';

export function useOnDrop<T>(): HandleDrop<T> {
  const context = useContext(StudioDragAndDropRootContext);
  if (!context) {
    throw new Error('useOnDrop must be used within a DragAndDropRootContext provider.');
  }
  return context.onDrop;
}
