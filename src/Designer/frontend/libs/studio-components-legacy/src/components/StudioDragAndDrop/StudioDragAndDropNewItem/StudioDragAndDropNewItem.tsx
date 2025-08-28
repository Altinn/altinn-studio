import type { ReactNode } from 'react';
import React from 'react';
import { useDrag } from 'react-dnd';
import type { NewDndItem } from '../types';
import { DraggableEditorItemType } from '../types';
import { draggableToolbarItemId } from '../testUtils/dataTestIds';

export interface StudioDragAndDropNewItemProps<T> {
  /** If true, the item cannot be dragged. */
  notDraggable?: boolean;

  /** The item to be dragged. */
  children?: ReactNode;

  /** Payload that wll be sent to the drop function when dropping the component somewhere. */
  payload: T;
}

export function StudioDragAndDropNewItem<T>({
  children,
  notDraggable,
  payload,
}: StudioDragAndDropNewItemProps<T>) {
  const [, drag] = useDrag<NewDndItem<T>>({
    item: { isNew: true, payload },
    type: DraggableEditorItemType.ToolbarItem,
    canDrag: () => !notDraggable,
  });
  return (
    <div ref={drag} data-testid={draggableToolbarItemId}>
      {children}
    </div>
  );
}
