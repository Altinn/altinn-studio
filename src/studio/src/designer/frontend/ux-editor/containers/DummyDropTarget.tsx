import { DropTargetHookSpec, DropTargetMonitor, useDrop } from 'react-dnd';
import React from 'react';
import { EditorDndEvents, EditorDndItem, ItemType } from './helpers/dnd-types';

const dropTargetSpec = (
  containerId: string,
  index: number,
  events: EditorDndEvents,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.values(ItemType),
  collect(monitor: DropTargetMonitor) {
    return {
      isOver: monitor.isOver(),
    };
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
      droppedItem.onDrop(containerId, index);
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
    if (!draggedItem.containerId && draggedItem.type !== ItemType.ToolbarItem) {
      return;
    }

    const targetItem: EditorDndItem = {
      id: containerId,
      type: ItemType.Container,
      index: null,
    };
    events.moveItem(draggedItem, targetItem, index);
  },
});

interface DummyDropTargetProps {
  index: number;
  containerId: string;
  events: EditorDndEvents;
}
export const DummyDropTarget = ({
  index,
  containerId,
  events,
}: DummyDropTargetProps) => {
  const [, drop] = useDrop(dropTargetSpec(containerId, index, events));
  return <div ref={drop} style={{ height: 12 }}></div>;
};
