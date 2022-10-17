import { DragSourceHookSpec, DragSourceMonitor, DropTargetHookSpec, XYCoord } from 'react-dnd';

export interface DragItem {
  index: number;
  itemId: string;
  containerId: string;
}
export const itemType = 'SCHEMA_ITEM_LABEL';
export const dropTargetSpec = (
  targetItem: DragItem,
  refCurrent: HTMLDivElement | null,
  moveThing: (from: DragItem, to: DragItem) => void,
): DropTargetHookSpec<any, any, any> => ({
  accept: itemType,
  collect(monitor) {
    return {
      handlerId: monitor.getHandlerId(),
    };
  },
  hover(draggedItem: DragItem, monitor) {
    if (!refCurrent) {
      return;
    }
    const draggedItemIndex = draggedItem.index;
    const targetIndex = targetItem.index;

    // Don't replace items with themselves
    if (draggedItem.index === targetItem.index) {
      return;
    }

    // We currently just support dragging inside the same container.
    if (draggedItem.containerId !== targetItem.containerId) {
      return;
    }
    // Determine rectangle on screen
    const hoverBoundingRect = refCurrent.getBoundingClientRect();

    // Get vertical middle
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

    // Determine mouse position
    const clientOffset = monitor.getClientOffset();

    // Get pixels to the top
    const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%

    // Dragging downwards
    if (draggedItemIndex < targetIndex && hoverClientY < hoverMiddleY) {
      return;
    }

    // Dragging upwards
    if (draggedItemIndex > targetIndex && hoverClientY > hoverMiddleY) {
      return;
    }

    // Time to actually perform the action
    moveThing(draggedItem, targetItem);

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    draggedItem.index = targetIndex;
  },
});

export const dragSourceSpec = (item: DragItem): DragSourceHookSpec<any, any, any> => ({
  type: itemType,
  item,
  collect: (monitor: DragSourceMonitor) => ({
    isDragging: monitor.isDragging(),
  }),
  isDragging: (monitor) => item.itemId === monitor.getItem()?.itemId,
});
