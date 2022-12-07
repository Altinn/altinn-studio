import type { ReactNode, RefObject } from 'react';
import React, { memo, useRef } from 'react';
import type { ConnectDragSource, DropTargetHookSpec, DropTargetMonitor } from 'react-dnd';
import { useDrag, useDrop } from 'react-dnd';
import {
  dragSourceSpec,
  handleDrop,
  hoverIndexHelper,
  hoverShouldBeIgnored,
} from './helpers/dnd-helpers';
import type { EditorDndEvents, EditorDndItem } from './helpers/dnd-types';
import { ItemType } from './helpers/dnd-types';

export const dropTargetSpec = (
  targetItem: EditorDndItem,
  events: EditorDndEvents,
  ref: RefObject<HTMLDivElement>
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.values(ItemType),
  canDrop(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    return monitor.isOver({ shallow: true });
  },
  drop(droppedItem: EditorDndItem, monitor: DropTargetMonitor) {
    handleDrop(droppedItem, monitor, events.onDropItem, targetItem.containerId, targetItem.index);
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
        monitor.getClientOffset()
      )
    ) {
      return;
    }
    events.moveItem(draggedItem, targetItem);
  },
});

export interface IDroppableDraggableComponentProps {
  canDrag: boolean;
  component: (dragHandleRef: ConnectDragSource) => ReactNode;
  containerId: string;
  dndEvents: EditorDndEvents;
  id: string;
  index: number;
}

export const DroppableDraggableComponent = memo(function DroppableDraggableComponent({
  canDrag,
  component,
  containerId,
  dndEvents,
  id,
  index,
}: IDroppableDraggableComponentProps) {

  const wrapperRef = useRef<HTMLDivElement>(null);

  const item = { id, containerId, index, type: ItemType.Item };
  const [{ isDragging }, drag, dragPreview] = useDrag(dragSourceSpec(item, canDrag, dndEvents.onDropItem));

  const [, drop] = useDrop(dropTargetSpec(item, dndEvents, wrapperRef));
  const opacity = isDragging ? 0.25 : 1;
  const background = isDragging ? 'inherit !important' : undefined;

  return (
    <div ref={wrapperRef}>
      <div ref={drop}>
        <div ref={dragPreview} style={{opacity, background}}>
          {component(drag)}
        </div>
      </div>
    </div>
  );
});
