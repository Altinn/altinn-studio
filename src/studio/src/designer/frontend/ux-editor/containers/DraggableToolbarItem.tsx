import React from 'react';
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

export const DraggableToolbarItem: React.FC<IDraggableProps> = ({
  id,
  children,
  onDrop,
  notDraggable,
}) => {
  const item = { id, onDrop, type: ItemType.TOOLBAR_ITEM };
  // eslint-disable-next-line no-empty-pattern
  const [{}, drag] = useDrag(draggableToolbarItemSpec(item, notDraggable));
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) =>
    event.key === 'Enter' ? onDrop() : undefined;

  return (
    <div ref={drag} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};
