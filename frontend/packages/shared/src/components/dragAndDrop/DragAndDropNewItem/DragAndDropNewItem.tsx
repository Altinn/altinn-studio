import type { ReactNode } from 'react';
import React from 'react';
import { useDrag } from 'react-dnd';
import type { NewDndItem } from 'app-shared/types/dndTypes';
import { DraggableEditorItemType } from 'app-shared/types/dndTypes';
import * as testids from '../../../../../../testing/testids';

export interface DragAndDropNewItemProps<T> {
  /** If true, the item cannot be dragged. */
  notDraggable?: boolean;

  /** The item to be dragged. */
  children?: ReactNode;

  /** Payload that wll be sent to the drop function when dropping the component somewhere. */
  payload: T;
}

export function DragAndDropNewItem<T>({
  children,
  notDraggable,
  payload,
}: DragAndDropNewItemProps<T>) {
  const [, drag] = useDrag<NewDndItem<T>>({
    item: { isNew: true, payload },
    type: DraggableEditorItemType.ToolbarItem,
    canDrag: () => !notDraggable,
  });
  return (
    <div ref={drag} data-testid={testids.draggableToolbarItem}>
      {children}
    </div>
  );
}
