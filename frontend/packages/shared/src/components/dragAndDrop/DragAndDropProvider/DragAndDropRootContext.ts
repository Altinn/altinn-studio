import { createContext } from 'react';
import { HandleDrop } from 'app-shared/types/dndTypes';

export interface DragAndDropRootContextProps<T> {
  rootId: string;
  onDrop: HandleDrop<T>;
  uniqueDomId: string;
}

export const DragAndDropRootContext = createContext<DragAndDropRootContextProps<unknown>>(null);
