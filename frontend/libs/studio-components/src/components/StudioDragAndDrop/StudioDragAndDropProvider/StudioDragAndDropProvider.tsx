import type { ReactNode } from 'react';
import React, { useId } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StudioDragAndDropRootContext } from './StudioDragAndDropRootContext';
import type { HandleAdd, HandleDrop, HandleMove } from '../types';
import { StudioDragAndDropListItemContext } from '../StudioDragAndDropListItem';

export interface StudioDragAndDropProviderProps<T> {
  children: ReactNode;
  gap?: string;
  onAdd: HandleAdd<T>;
  onMove: HandleMove;
  rootId: string;
  itemId?: string;
}

export function StudioDragAndDropProvider<T>({
  children,
  gap = '1rem',
  onAdd,
  onMove,
  rootId,
  itemId,
}: StudioDragAndDropProviderProps<T>) {
  const onDrop: HandleDrop<T> = (item, position) =>
    item.isNew === true ? onAdd(item.payload, position) : onMove(item.id, position);
  const uniqueDomId = useId(); // Can not be the same as root id because root id might not be unique (if there are multiple drag and drop lists)
  return (
    <DndProvider backend={HTML5Backend}>
      <StudioDragAndDropRootContext.Provider value={{ gap, rootId, onDrop, uniqueDomId }}>
        <StudioDragAndDropListItemContext.Provider value={{ isDisabled: false, itemId }}>
          {children}
        </StudioDragAndDropListItemContext.Provider>
      </StudioDragAndDropRootContext.Provider>
    </DndProvider>
  );
}
