import { DragSourceHookSpec, DragSourceMonitor, XYCoord } from 'react-dnd';
import { RefObject } from 'react';
import { ContainerPos, EditorDndItem } from './dnd-types';

// @see https://react-dnd.github.io/react-dnd/examples/sortable/simple
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

/**
 *
 *
 *
 * @param boundingClientRect
 * @param clientOffset
 */
export const getContainerPosition = (
  boundingClientRect: DOMRect,
  clientOffset: XYCoord,
): ContainerPos | undefined => {
  // need to support smaller boxes so that they don't jump around.
  const boundaryHeight = Math.min(50, boundingClientRect.height / 4);
  const toptop = boundingClientRect.top;
  const topbottom = boundingClientRect.top + boundaryHeight;
  const bottomtop = boundingClientRect.bottom - boundaryHeight;
  const bottombottom = boundingClientRect.bottom;
  const { y } = clientOffset;
  if (y > toptop && y < topbottom) {
    return ContainerPos.Top;
  }
  if (y > bottomtop && y < bottombottom) {
    return ContainerPos.Bottom;
  }
  return undefined;
};
