import React, { FC } from 'react';
import { useDrag } from 'react-dnd';
import { DragSourceHookSpec } from 'react-dnd/src/hooks/types';
import { EditorDndItem, ItemType } from './helpers/dnd-types';

export interface IDraggableProps {
  id: string;
  index?: number;
  containerId: string;
  notDraggable?: boolean;
  onDrop?: (containerId?: string, position?: number) => void;
}

const draggableToolbarItemSpec = (
  item: EditorDndItem,
  notDraggable: boolean,
): DragSourceHookSpec<any, any, any> => ({
  item,
  type: item.type,
  canDrag: () => !notDraggable,
});

export const DraggableToolbarItem: FC<IDraggableProps> = ({
  id,
  children,
  onDrop,
  notDraggable,
}) => {
  const item = { id, onDrop, type: ItemType.ToolbarItem };
  const [, drag] = useDrag(draggableToolbarItemSpec(item, notDraggable));
  return <div ref={drag}>{children}</div>;
};
