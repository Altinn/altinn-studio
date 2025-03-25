import { createContext } from 'react';
import type { HandleDrop } from '../types';

export interface StudioDragAndDropRootContextProps<T> {
  gap: string;
  rootId: string;
  onDrop: HandleDrop<T>;
  uniqueDomId: string;
}

export const StudioDragAndDropRootContext =
  createContext<StudioDragAndDropRootContextProps<unknown>>(null);
