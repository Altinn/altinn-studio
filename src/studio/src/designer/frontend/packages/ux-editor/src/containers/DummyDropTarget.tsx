import React from 'react';
import type { DropTargetHookSpec, DropTargetMonitor } from 'react-dnd';
import { useDrop } from 'react-dnd';
import type { EditorDndEvents, EditorDndItem } from './helpers/dnd-types';
import { ItemType } from './helpers/dnd-types';
import { handleDrop, hoverShouldBeIgnored } from './helpers/dnd-helpers';

export const dropTargetSpec = (
  containerId: string,
  index: number,
  events: EditorDndEvents
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.values(ItemType),
  collect(monitor: DropTargetMonitor) {
    return {
      isOver: monitor.isOver(),
    };
  },
  drop(droppedItem: EditorDndItem, monitor: DropTargetMonitor) {
    handleDrop(droppedItem, monitor, events.onDropItem, containerId, index);
  },
  hover(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (hoverShouldBeIgnored(monitor, draggedItem)) {
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
export const DummyDropTarget = ({ index, containerId, events }: DummyDropTargetProps) => {
  const [, drop] = useDrop(dropTargetSpec(containerId, index, events));
  return <div ref={drop} style={{ height: 12 }} data-testid={'dummy-drop-target'}></div>;
};
