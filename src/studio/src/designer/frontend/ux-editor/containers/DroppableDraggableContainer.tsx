import React, { FC, memo, ReactNode, RefObject, useRef } from 'react';
import {
  DropTargetHookSpec,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { dragSourceSpec, getContainerPosition } from './helpers/dnd-helpers';
import {
  ContainerPos,
  EditorDndEvents,
  EditorDndItem,
  ItemType,
} from './helpers/dnd-types';

const dropTargetSpec = (
  targetItem: EditorDndItem,
  events: EditorDndEvents,
  ref: RefObject<HTMLDivElement>,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.keys(ItemType),
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
      if (
        getContainerPosition(
          ref.current.getBoundingClientRect(),
          monitor.getClientOffset(),
        ) === ContainerPos.Top
      ) {
        droppedItem.onDrop(targetItem.id, 0);
      } else {
        droppedItem.onDrop(targetItem.id, 99);
      }
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
    if (draggedItem.id === targetItem.id) {
      return;
    }
    if (draggedItem.containerId === targetItem.id) {
      return;
    }
    const containerPos = getContainerPosition(
      ref.current?.getBoundingClientRect(),
      monitor.getClientOffset(),
    );

    if (!containerPos) {
      return;
    }

    if (draggedItem.containerId === targetItem.id) {
      monitor.getDifferenceFromInitialOffset().y > 0
        ? events.moveItemToBottom(draggedItem)
        : events.moveItemToTop(draggedItem);
    } else if (containerPos) {
      events.moveItem(draggedItem, targetItem, containerPos);
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

export const DroppableDraggableContainer: FC<IDroppableDraggableContainerProps> =
  memo(function DroppableDraggableContainer({
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
    const [{ isDragging }, drag] = useDrag(
      dragSourceSpec(item, canDrag, dndEvents.onDropItem),
    );
    const [{ isOver }, drop] = useDrop(dropTargetSpec(item, dndEvents, ref));
    const opacity = isDragging ? 0 : 1;
    const backgroundColor = isOver
      ? 'white'
      : altinnTheme.altinnPalette.primary.greyLight;
    const style = {
      backgroundColor,
      paddingLeft: '1.2rem',
      paddingRight: '1.2rem',
      paddingTop: isBaseContainer ? '1.2rem' : '',
      border: parentContainerId ? '' : '1px solid #ccc',
      marginBottom: isBaseContainer ? '' : '12px',
      opacity,
    };
    drag(drop(ref));
    return (
      <div
        style={style}
        ref={ref}
        data-testid={'droppable-draggable-container'}
      >
        {children}
      </div>
    );
  });
