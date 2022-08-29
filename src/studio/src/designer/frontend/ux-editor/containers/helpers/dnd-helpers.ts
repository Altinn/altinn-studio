/**
 * Have no clue what this actually does... but code was repeted a lot
 */
import { DragSourceHookSpec, DragSourceMonitor, XYCoord } from 'react-dnd';
import { RefObject } from 'react';

/**
 *
 * @see https://react-dnd.github.io/react-dnd/examples/sortable/simple
 */
export const hoverIndexHelper = (
  draggedItem: EditorDndItem,
  hoveredItem: EditorDndItem,
  ref: RefObject<HTMLDivElement>,
  clientOffset: XYCoord,
): boolean => {
  const dragIndex = draggedItem.index;
  const hoverIndex = hoveredItem.index;

  if (!ref.current || dragIndex === hoverIndex) {
    return false;
  }

  // Determine rectangle on screen
  const hoverBoundingRect = ref.current?.getBoundingClientRect();

  // Get vertical middle
  const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

  // Get pixels to the top
  const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

  // Only perform the move when the mouse has crossed half of the items height
  // When dragging downwards, only move when the cursor is below 50%
  // When dragging upwards, only move when the cursor is above 50%

  // Dragging downwards
  if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
    return false;
  }

  // Dragging upwards
  if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
    return false;
  }

  return true;
};

export interface EditorDndItem {
  id: string; // itemId, regardless.
  containerId?: string;
  onDrop?: (containerId: string, position: number) => void;
  index?: number;
  type: ItemType;
}

export enum ItemType {
  TOOLBAR_ITEM = 'TOOLBAR_ITEM',
  ITEM = 'ITEM',
  CONTAINER = 'CONTAINER',
  Right = 'RIGHT',
}

/**
 * @see DesignView
 */
export interface EditorDndEvents {
  moveItem: (
    movedItem: EditorDndItem,
    targetItem: EditorDndItem,
    movingDown?: boolean,
  ) => void;
  moveItemToBottom: (item: EditorDndItem) => void;
  moveItemToTop: (item: EditorDndItem) => void;
  onDropItem: (reset?: boolean) => void;
}

/**
 * Very simple helper to just swap two items in an array
 * @param arr
 * @param itemA
 * @param itemB
 */
export const swapArrayElements = (arr: any[], itemA: any, itemB: any) => {
  const out = [...arr];
  const indexA = arr.indexOf(itemA);
  const indexB = arr.indexOf(itemB);
  out[indexA] = arr[indexB];
  out[indexB] = arr[indexA];
  return out;
};

export const removeArrayElement = (arr: any[], item: any) => {
  const out = [...arr];
  const index = arr.indexOf(item);
  if (index > -1) {
    // only splice array when item is found
    out.splice(index, 1); // 2nd parameter means remove one item only
  }
  return out;
};

export const dragSourceSpec = (
  item: EditorDndItem,
  canDrag: boolean,
  onDropItem: (reset: boolean) => void,
): DragSourceHookSpec<any, any, any> => ({
  type: item.type,
  item,
  collect: (monitor: DragSourceMonitor) => {
    return {
      isDragging: monitor.isDragging(),
    };
  },
  canDrag() {
    return canDrag;
  },
  isDragging(monitor) {
    return item.id === monitor.getItem()?.id;
  },
  end(draggedItem: EditorDndItem, monitor: DragSourceMonitor) {
    if (!monitor.didDrop() && draggedItem) {
      onDropItem(true);
    }
  },
});
