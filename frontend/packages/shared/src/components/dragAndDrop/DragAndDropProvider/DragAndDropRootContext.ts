import { createContext } from 'react';
import { HandleDrop } from 'app-shared/types/dndTypes';

export interface DragAndDropRootContextProps<T> {
  rootId: string;
  onDrop: HandleDrop<T>;
}

export const DragAndDropRootContext = createContext<DragAndDropRootContextProps<unknown>>(null);
