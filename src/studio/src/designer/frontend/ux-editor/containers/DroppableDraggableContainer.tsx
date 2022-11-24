import type { ReactNode, RefObject } from 'react';
import React, { memo, useRef } from 'react';
import type { DropTargetHookSpec, DropTargetMonitor } from 'react-dnd';
import { useDrag, useDrop } from 'react-dnd';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import {
  dragSourceSpec,
  getContainerPosition,
  handleDrop,
  hoverShouldBeIgnored,
} from './helpers/dnd-helpers';
import type { EditorDndEvents, EditorDndItem } from './helpers/dnd-types';
import { ContainerPos, ItemType } from './helpers/dnd-types';
import { DummyDropTarget } from './DummyDropTarget';

export const dropTargetSpec = (
  targetItem: EditorDndItem,
  events: EditorDndEvents,
  ref: RefObject<HTMLDivElement>
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.values(ItemType),
  collect(monitor: DropTargetMonitor) {
    return {
      isOver: monitor.isOver(),
    };
  },
  drop(droppedItem: EditorDndItem, monitor: DropTargetMonitor) {
    handleDrop(
      droppedItem,
      monitor,
      events.onDropItem,
      targetItem.id,
      getContainerPosition(ref.current?.getBoundingClientRect(), monitor.getClientOffset()) ===
        ContainerPos.Top
        ? 0
        : 99
    );
  },
  hover(draggedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (hoverShouldBeIgnored(monitor, draggedItem)) {
      return;
    }
    if (draggedItem.id === targetItem.id) {
      return;
    }
    if (draggedItem.containerId === targetItem.id) {
      return;
    }
    const containerPos = getContainerPosition(
      ref.current?.getBoundingClientRect(),
      monitor.getClientOffset()
    );

    if (!containerPos) {
      return;
    }

    if (draggedItem.containerId === targetItem.id) {
      monitor.getDifferenceFromInitialOffset().y > 0
        ? events.moveItemToBottom(draggedItem)
        : events.moveItemToTop(draggedItem);
    } else if (containerPos) {
      const toIndex = containerPos === ContainerPos.Top ? 0 : 99;
      events.moveItem(draggedItem, targetItem, toIndex);
    }
  },
});

export interface IDroppableDraggableContainerProps {
  canDrag: boolean;
  children?: ReactNode;
  dndEvents: EditorDndEvents;
  id: string;
  index?: number;
  isBaseContainer: boolean;
  parentContainerId?: string;
}

export const DroppableDraggableContainer = memo(function DroppableDraggableContainer({
  canDrag,
  children,
  dndEvents,
  id,
  index,
  isBaseContainer,
  parentContainerId,
}: IDroppableDraggableContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const item = {
    id,
    index,
    containerId: parentContainerId,
    type: ItemType.Container,
  };
  const [{ isDragging }, drag] = useDrag(dragSourceSpec(item, canDrag, dndEvents.onDropItem));
  const [{ isOver }, drop] = useDrop(dropTargetSpec(item, dndEvents, ref));
  const opacity = isDragging ? 0 : 1;
  const backgroundColor = isOver ? 'white' : altinnTheme.altinnPalette.primary.greyLight;
  const style = {
    backgroundColor,
    paddingLeft: '1.2rem',
    paddingRight: '1.2rem',
    border: isBaseContainer ? '1px solid #ccc' : '',
    opacity,
  };
  drag(drop(ref));
  return (
    <>
      <DummyDropTarget
        index={isBaseContainer ? 0 : index}
        containerId={isBaseContainer ? id : parentContainerId}
        events={dndEvents}
      />
      <div style={style} ref={ref} data-testid={'droppable-draggable-container'}>
        {children}
      </div>
      <DummyDropTarget
        index={isBaseContainer ? 99 : index + 1}
        containerId={isBaseContainer ? id : parentContainerId}
        events={dndEvents}
      />
    </>
  );
});
