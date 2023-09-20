import React, { ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DragAndDropRootContext } from './DragAndDropRootContext';
import { HandleAdd, HandleDrop, HandleMove } from 'app-shared/types/dndTypes';

export interface DragAndDropProviderProps<T> {
  rootId: string;
  children: ReactNode;
  onAdd: HandleAdd<T>;
  onMove: HandleMove;
}

export function DragAndDropProvider<T>({
  children,
  rootId,
  onAdd,
  onMove,
}: DragAndDropProviderProps<T>) {
  const onDrop: HandleDrop<T> = (item, position) =>
    item.isNew === true ? onAdd(item.payload, position) : onMove(item.id, position);
  return (
    <DndProvider backend={HTML5Backend}>
      <DragAndDropRootContext.Provider value={{ rootId, onDrop }}>
        {children}
      </DragAndDropRootContext.Provider>
    </DndProvider>
  );
}
