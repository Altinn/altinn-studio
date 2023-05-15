import React from 'react';
import { useDrag } from 'react-dnd';
import type { DragSourceHookSpec } from 'react-dnd/src/hooks/types';
import type { EditorDndItem } from '../types/dndTypes';
import { ItemType } from '../types/dndTypes';

export interface IDraggableProps {
  id: string;
  index?: number;
  containerId: string;
  notDraggable?: boolean;
  onDrop?: (containerId?: string, position?: number) => void;
  children?: React.ReactNode;
}

const draggableToolbarItemSpec = (
  item: EditorDndItem,
  notDraggable: boolean
): DragSourceHookSpec<any, any, any> => ({
  item,
  type: item.type,
  canDrag: () => !notDraggable,
});

export const DraggableToolbarItem = ({ id, children, onDrop, notDraggable }: IDraggableProps) => {
  const item = { id, onDrop, type: ItemType.ToolbarItem };
  const [, drag] = useDrag(draggableToolbarItemSpec(item, notDraggable));
  return <div ref={drag}>{children}</div>;
};
