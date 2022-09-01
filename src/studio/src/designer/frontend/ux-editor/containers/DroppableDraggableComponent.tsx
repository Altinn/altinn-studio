import React, { FC, memo, ReactNode, RefObject, useRef } from 'react';
import {
  DropTargetHookSpec,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import { dragSourceSpec, hoverIndexHelper } from './helpers/dnd-helpers';
import { EditorDndEvents, EditorDndItem, ItemType } from './helpers/dnd-types';

const dropTargetSpec = (
  targetItem: EditorDndItem,
  events: EditorDndEvents,
  ref: RefObject<HTMLDivElement>,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.keys(ItemType),
  canDrop(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    return monitor.isOver({ shallow: true });
  },
  drop(droppedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (!droppedItem) {
      return;
    }
    if (!monitor.isOver({ shallow: true })) {
      return;
    }
    if (monitor.getItemType() === ItemType.ToolbarItem) {
      if (!droppedItem.onDrop) {
        console.warn("Draggable Item doesn't have an onDrop-event");
        return;
      }
      droppedItem.onDrop(targetItem.containerId, targetItem.index);
    } else {
      events.onDropItem();
    }
  },
  hover(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (!draggedItem) {
      return;
    }
    if (!monitor.isOver({ shallow: true })) {
      return;
    }
    if (
      !hoverIndexHelper(draggedItem, targetItem, ref, monitor.getClientOffset())
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

export const DroppableDraggableComponent: FC<IDroppableDraggableComponentProps> =
  memo(function DroppableDraggableComponent({
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
  });
