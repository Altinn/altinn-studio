import React, { RefObject, useRef } from 'react';
import {
  DragSourceHookSpec,
  DragSourceMonitor,
  DropTargetHookSpec,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import {
  EditorDndEvents,
  EditorDraggableItem,
  ItemType,
} from './helpers/dnd-helpers';

const dragSourceSpec = (
  item: EditorDraggableItem,
  canDrag: boolean,
): DragSourceHookSpec<any, any, any> => ({
  type: ItemType.CONTAINER,
  item,
  collect: (monitor: DragSourceMonitor) => ({
    isDragging: monitor.isDragging(),
  }),
  canDrag() {
    return canDrag;
  },
});

const dropTargetSpec = (
  targetItem: EditorDraggableItem,
  dndEvents: EditorDndEvents,
  ref: RefObject<HTMLDivElement>,
  isBaseContainer: boolean,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.keys(ItemType),
  collect(monitor: DropTargetMonitor) {
    return {
      isOver: monitor.isOver(),
    };
  },
  drop(droppedItem: EditorDraggableItem, monitor: DropTargetMonitor) {
    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case ItemType.TOOLBAR_ITEM: {
          if (!droppedItem.onDrop) {
            console.warn("Draggable Item doesn't have an onDrop-event");
            break;
          }
          droppedItem.onDrop(targetItem.id, targetItem.index);
          break;
        }
        case ItemType.ITEM: {
          dndEvents.onDropComponent();
          droppedItem.index = targetItem.index;
          break;
        }
        case ItemType.CONTAINER: {
          if (isBaseContainer) {
            // We can't get the index here, so let's not do anything
            dndEvents.onDropContainer();
            break;
          } else {
            dndEvents.onDropContainer();
          }
          break;
        }
        default: {
          break;
        }
      }
    }
  },
  hover(draggedItem: EditorDraggableItem, monitor: DropTargetMonitor) {
    if (!draggedItem) {
      return;
    }

    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case ItemType.CONTAINER: {
          if (
            draggedItem.id === targetItem.id ||
            draggedItem.index === targetItem.index ||
            draggedItem.containerId === targetItem.id
          ) {
            return;
          }
          dndEvents.onMoveContainer(draggedItem, targetItem);
          draggedItem.index = targetItem.index;
          break;
        }
        case ItemType.ITEM: {
          if (
            draggedItem.id === targetItem.id ||
            draggedItem.index === targetItem.index ||
            draggedItem.containerId === targetItem.id
          ) {
            return;
          }
          dndEvents.onMoveContainer(draggedItem, targetItem);
          draggedItem.index = targetItem.index;
          draggedItem.containerId = targetItem.id;
          break;
        }
        default: {
          break;
        }
      }
    }
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
  const item = { id, index };
  const [{ isDragging }, drag] = useDrag(dragSourceSpec(item, canDrag));
  const [{ isOver }, drop] = useDrop(
    dropTargetSpec(item, dndEvents, ref, isBaseContainer),
  );
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
    <div style={style} ref={ref}>
      {children}
    </div>
  );
};
