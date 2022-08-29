import React, { RefObject, useRef } from 'react';
import {
  DropTargetHookSpec,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import {
  dragSourceSpec,
  EditorDndEvents,
  EditorDndItem,
  hoverIndexHelper,
  ItemType,
} from './helpers/dnd-helpers';

const dropTargetSpec = (
  targetItem: EditorDndItem,
  dndEvents: EditorDndEvents,
  ref: RefObject<HTMLDivElement>,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.keys(ItemType),
  collect(monitor: DropTargetMonitor) {
    return {
      isOver: monitor.isOver(),
    };
  },
  drop(droppedItem: EditorDndItem, monitor: DropTargetMonitor) {
    if (monitor.isOver({ shallow: true })) {
      if (monitor.getItemType() === ItemType.TOOLBAR_ITEM) {
        if (!droppedItem.onDrop) {
          console.warn("Draggable Item doesn't have an onDrop-event");
          return;
        }
        // this need to figure out if we are at the top or bottom of the component
        droppedItem.onDrop(targetItem.id, 0);
      } else {
        dndEvents.onDropItem();
      }
    }
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
    // Item is in this container all ready
    if (draggedItem.containerId === targetItem.id) {
      movingDown
        ? dndEvents.moveItemToBottom(draggedItem)
        : dndEvents.moveItemToTop(draggedItem);
    } else {
      dndEvents.moveItem(draggedItem, targetItem, movingDown);
    }

    // We are not moving the container when we change positions
  },
});

export interface IDroppableDraggableContainerProps {
  isBaseContainer: boolean;
  canDrag: boolean;
  dndEvents: EditorDndEvents;
  id: string;
  index?: number;
  parentContainerId?: string;
}

export const DroppableDraggableContainer: React.FC<
  IDroppableDraggableContainerProps
> = ({
  dndEvents,
  isBaseContainer,
  canDrag,
  children,
  id,
  index,
  parentContainerId,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const item = {
    id,
    index,
    containerId: parentContainerId,
    type: ItemType.CONTAINER,
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
    <div style={style} ref={ref} data-testid={'droppable-draggable-container'}>
      {children}
    </div>
  );
};
