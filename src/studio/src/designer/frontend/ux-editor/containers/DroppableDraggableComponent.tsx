import React, { memo, ReactNode, RefObject, useRef } from 'react';
import {
  DropTargetHookSpec,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import {
  dragSourceSpec,
  handleDrop,
  hoverIndexHelper,
  hoverShouldBeIgnored,
} from './helpers/dnd-helpers';
import { EditorDndEvents, EditorDndItem, ItemType } from './helpers/dnd-types';

export const dropTargetSpec = (
  targetItem: EditorDndItem,
  events: EditorDndEvents,
  ref: RefObject<HTMLDivElement>,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.values(ItemType),
  canDrop(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    return monitor.isOver({ shallow: true });
  },
  drop(droppedItem: EditorDndItem, monitor: DropTargetMonitor) {
    handleDrop(
      droppedItem,
      monitor,
      events.onDropItem,
      targetItem.containerId,
      targetItem.index,
    );
  },
  hover(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (hoverShouldBeIgnored(monitor, draggedItem)) {
      return;
    }
    if (
      !hoverIndexHelper(
        draggedItem,
        targetItem,
        ref.current?.getBoundingClientRect(),
        monitor.getClientOffset(),
      )
    ) {
      return;
    }
    events.moveItem(draggedItem, targetItem);
  },
});

export interface IDroppableDraggableComponentProps {
  canDrag: boolean;
  children?: ReactNode;
  containerId: string;
  dndEvents: EditorDndEvents;
  id: string;
  index: number;
}

export const DroppableDraggableComponent = memo(
  function DroppableDraggableComponent({
    canDrag,
    children,
    containerId,
    dndEvents,
    id,
    index,
  }: IDroppableDraggableComponentProps) {
    const ref = useRef<HTMLDivElement>(null);

    const item = { id, containerId, index, type: ItemType.Item };
    const [{ isDragging }, drag] = useDrag(
      dragSourceSpec(item, canDrag, dndEvents.onDropItem),
    );

    const [, drop] = useDrop(dropTargetSpec(item, dndEvents, ref));
    const opacity = isDragging ? 0 : 1;
    const background = isDragging ? 'inherit !important' : undefined;

    drag(drop(ref));
    return (
      <div style={{ opacity, background }} ref={ref}>
        {children}
      </div>
    );
  },
);
