import React from 'react';
import { useDrag } from 'react-dnd';
import { DragSourceHookSpec } from 'react-dnd/src/hooks/types';
import { EditorDraggableItem, ItemType } from './helpers/dnd-helpers';

export interface IDraggableProps {
  id: string;
  index?: number;
  containerId: string;
  notDraggable?: boolean;
  onDrop?: (...args: any) => void;
}

const draggableToolbarItemSpec = (
  item: EditorDraggableItem,
  notDraggable: boolean,
): DragSourceHookSpec<any, any, any> => ({
  item,
  type: ItemType.TOOLBAR_ITEM,
  canDrag: () => !notDraggable,
});

export const DraggableToolbarItem: React.FC<IDraggableProps> = ({
  id,
  children,
  onDrop,
  notDraggable,
}) => {
  const [_collected, drag] = useDrag(
    draggableToolbarItemSpec({ id, onDrop }, notDraggable),
  );
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) =>
    event.key === 'Enter' ? onDrop() : undefined;

  return (
    <div ref={drag} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};
