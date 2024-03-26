import type { ReactNode } from 'react';
import React, { useId } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DragAndDropRootContext } from './DragAndDropRootContext';
import type { HandleAdd, HandleDrop, HandleMove } from 'app-shared/types/dndTypes';
import { DragAndDropListItemContext } from '../DragAndDropListItem';

export interface DragAndDropProviderProps<T> {
  children: ReactNode;
  gap?: string;
  onAdd: HandleAdd<T>;
  onMove: HandleMove;
  rootId: string;
  itemId: string;
}

export function DragAndDropProvider<T>({
  children,
  gap = '1rem',
  onAdd,
  onMove,
  rootId,
  itemId,
}: DragAndDropProviderProps<T>) {
  const onDrop: HandleDrop<T> = (item, position) =>
    item.isNew === true ? onAdd(item.payload, position) : onMove(item.id, position);
  const uniqueDomId = useId(); // Can not be the same as root id because root id might not be unique (if there are multiple drag and drop lists)
  return (
    <DndProvider backend={HTML5Backend}>
      <DragAndDropRootContext.Provider value={{ gap, rootId, onDrop, uniqueDomId }}>
        <DragAndDropListItemContext.Provider value={{ isDisabled: false, itemId }}>
          {children}
        </DragAndDropListItemContext.Provider>
      </DragAndDropRootContext.Provider>
    </DndProvider>
  );
}
