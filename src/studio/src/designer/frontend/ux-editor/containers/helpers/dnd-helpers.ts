/**
 * Have no clue what this actually does... but code was repeted a lot
 */
import { XYCoord } from 'react-dnd';
import { RefObject } from 'react';

/**
 *
 * @see https://react-dnd.github.io/react-dnd/examples/sortable/simple
 */
export const hoverIndexHelper = (
  draggedItem: EditorDraggableItem,
  hoveredItem: EditorDraggableItem,
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

export interface EditorDraggableItem {
  id: string;
  containerId?: string;
  onDrop?: (containerId: string, index: number) => void;
  parentContainerId?: string;
  index?: number;
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
  onDropComponent: (reset?: boolean) => void;
  onDropContainer: (reset?: boolean) => void;
  onMoveComponent: (
    movedItem: EditorDraggableItem,
    targetItem: EditorDraggableItem,
  ) => void;
  onMoveContainer: (
    movedItem: EditorDraggableItem,
    targetItem: EditorDraggableItem,
  ) => void;
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
