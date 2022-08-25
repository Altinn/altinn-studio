import React, { RefObject, useRef } from 'react';
import {
  DragSourceHookSpec,
  DragSourceMonitor,
  DropTargetHookSpec,
  DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import {
  EditorDndEvents,
  EditorDraggableItem,
  hoverIndexHelper,
  ItemType,
} from './helpers/dnd-helpers';

export interface IDroppableDraggableComponentProps {
  id: string;
  index: number;
  containerId: string;
  canDrag: boolean;
  dndEvents: EditorDndEvents;
}

const dragSourceSpec = (
  item: EditorDraggableItem,
  onDropComponent: (reset: boolean) => void,
  canDrag: boolean,
): DragSourceHookSpec<any, any, any> => ({
  type: 'ITEM',
  item,
  collect: (monitor: DragSourceMonitor) => ({
    isDragging: monitor.isDragging(),
  }),
  canDrag() {
    return canDrag;
  },
  end(draggedItem: EditorDraggableItem, monitor: DragSourceMonitor) {
    if (!monitor.didDrop() && draggedItem) {
      onDropComponent(true);
    }
    console.log(draggedItem, monitor.didDrop());
  },
});

const dropTargetSpec = (
  targetItem: EditorDraggableItem,
  events: EditorDndEvents,
  ref: RefObject<HTMLDivElement>,
): DropTargetHookSpec<any, any, any> => ({
  accept: Object.keys(ItemType),
  drop(droppedItem: EditorDraggableItem, monitor: DropTargetMonitor) {
    if (!droppedItem) {
      return;
    }
    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case ItemType.TOOLBAR_ITEM: {
          if (!droppedItem.onDrop) {
            console.warn("Draggable Item doesn't have an onDrop-event");
            break;
          }
          droppedItem.onDrop(targetItem.containerId, targetItem.index);
          break;
        }
        case ItemType.ITEM: {
          events.onDropComponent();
          break;
        }
        case ItemType.CONTAINER: {
          events.onDropContainer();
          break;
        }
        default: {
          break;
        }
      }
    }
  },
  canDrop(
    props: IDroppableDraggableComponentProps,
    monitor: DropTargetMonitor,
  ) {
    return monitor.isOver({ shallow: true });
  },
  hover(draggedItem: EditorDraggableItem, monitor: DropTargetMonitor) {
    if (!draggedItem) {
      return;
    }
    if (
      monitor.isOver({ shallow: true }) &&
      hoverIndexHelper(draggedItem, targetItem, ref, monitor.getClientOffset())
    ) {
      switch (monitor.getItemType()) {
        case ItemType.TOOLBAR_ITEM: {
          events.onMoveComponent(draggedItem, targetItem);
          break;
        }
        case ItemType.ITEM: {
          events.onMoveComponent(draggedItem, targetItem);
          draggedItem.index = targetItem.index;
          draggedItem.containerId = targetItem.containerId;
          break;
        }

        case ItemType.CONTAINER: {
          if (
            draggedItem.id === targetItem.id ||
            draggedItem.index === targetItem.index ||
            draggedItem.containerId === targetItem.id
          ) {
            return;
          }
          events.onMoveContainer(draggedItem, targetItem);
          draggedItem.index = targetItem.index;
          break;
        }
        default: {
          break;
        }
      }
    }
  },
});

export const DroppableDraggableComponent: React.FC<
  IDroppableDraggableComponentProps
> = ({ id, index, dndEvents, children, containerId, canDrag }) => {
  const ref = useRef<HTMLDivElement>(null);
  const item = { id, containerId, index };
  const [{ isDragging }, drag] = useDrag(
    dragSourceSpec(item, dndEvents.onDropComponent, canDrag),
  );
  // eslint-disable-next-line no-empty-pattern
  const [{}, drop] = useDrop(dropTargetSpec(item, dndEvents, ref));
  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));
  return (
    <div style={{ opacity }} ref={ref}>
      {children}
    </div>
  );
};
