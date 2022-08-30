import React, { memo, RefObject, useRef, useState } from 'react';
import {
  DropTargetHookSpec,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import { dragSourceSpec, hoverIndexHelper } from './helpers/dnd-helpers';
import { EditorDndEvents, EditorDndItem, ItemType } from './helpers/dnd-types';
import classNames from 'classnames';

const dropTargetSpec = (
  targetItem: EditorDndItem,
  events: EditorDndEvents,
  ref: RefObject<HTMLDivElement>,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.keys(ItemType),
  drop(droppedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (!droppedItem) {
      return; // no dropped item exiting
    }
    if (!monitor.isOver({ shallow: true })) {
      return; // is not over this particular item exiting
    }
    if (monitor.getItemType() === ItemType.TOOLBAR_ITEM) {
      if (!droppedItem.onDrop) {
        console.warn("Draggable Item doesn't have an onDrop-event");
        return;
      }
      droppedItem.onDrop(targetItem.containerId, targetItem.index);
    } else {
      events.onDropItem();
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
    events.moveItem(draggedItem, targetItem);
  },
});

export interface IDroppableDraggableComponentProps {
  canDrag: boolean;
  children?: React.ReactNode;
  containerId: string;
  dndEvents: EditorDndEvents;
  id: string;
  index: number;
}

export const DroppableDraggableComponent: React.FC<IDroppableDraggableComponentProps> =
  memo(function DroppableDraggableComponent({
    canDrag,
    children,
    containerId,
    dndEvents,
    id,
    index,
  }: IDroppableDraggableComponentProps) {
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

    const [dragging, setDragging] = useState(false);
    const onDrag = () => setDragging(true);
    const onDragEnd = () => setDragging(false);

    drag(drop(ref));
    return (
      <div
        style={{ opacity, background }}
        ref={ref}
        className={classNames({ dragging })}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
      >
        {children}
      </div>
    );
  });
