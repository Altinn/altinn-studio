import React, { RefObject, useRef } from 'react';
import {
  DropTargetHookSpec,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import {
  dragSourceSpec,
  EditorDndEvents,
  EditorDndItem,
  hoverIndexHelper,
  ItemType,
} from './helpers/dnd-helpers';

export interface IDroppableDraggableComponentProps {
  id: string;
  index: number;
  containerId: string;
  canDrag: boolean;
  dndEvents: EditorDndEvents;
}

const dropTargetSpec = (
  targetItem: EditorDndItem,
  events: EditorDndEvents,
  ref: RefObject<HTMLDivElement>,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.keys(ItemType),
  drop(droppedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (!droppedItem) {
      return;
    }
    if (monitor.isOver({ shallow: true })) {
      if (monitor.getItemType() === ItemType.TOOLBAR_ITEM) {
        if (!droppedItem.onDrop) {
          console.warn("Draggable Item doesn't have an onDrop-event");
          return;
        }
        droppedItem.onDrop(targetItem.containerId, targetItem.index);
      } else {
        events.onDropItem();
      }
    }
  },
  canDrop(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    return monitor.isOver({ shallow: true });
  },
  hover(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (!draggedItem) {
      return;
    }
    if (!monitor.isOver({ shallow: true })) {
      return; // we are not over... do nothing
    }
    if (
      !hoverIndexHelper(draggedItem, targetItem, ref, monitor.getClientOffset())
    ) {
      return; // we are not performing any actions
    }
    const movingDown = monitor.getDifferenceFromInitialOffset().y > 0;
    events.moveItem(draggedItem, targetItem, movingDown);
  },
});

export const DroppableDraggableComponent: React.FC<
  IDroppableDraggableComponentProps
> = ({ id, index, dndEvents, children, containerId, canDrag }) => {
  const ref = useRef<HTMLDivElement>(null);
  const item = { id, containerId, index, type: ItemType.ITEM };
  // eslint-disable-next-line no-empty-pattern
  const [{ isDragging }, drag] = useDrag(
    dragSourceSpec(item, canDrag, dndEvents.onDropItem),
  );

  // eslint-disable-next-line no-empty-pattern
  const [{}, drop] = useDrop(dropTargetSpec(item, dndEvents, ref));
  const opacity = isDragging ? 0 : 1;
  const background = isDragging ? 'inherit !important' : undefined;
  drag(drop(ref));
  return (
    <div style={{ opacity, background }} ref={ref}>
      {children}
    </div>
  );
};
