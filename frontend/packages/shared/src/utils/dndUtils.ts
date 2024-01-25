import type { DropTargetMonitor } from 'react-dnd';
import type { DndItem, ExistingDndItem, ItemPosition } from 'app-shared/types/dndTypes';
import { DragCursorPosition } from 'app-shared/types/dndTypes';
import type { RefObject } from 'react';
import { areObjectsEqual } from 'app-shared/utils/objectUtils';

/**
 * Calculates the position of the dragged item relative to the drop target.
 * @param monitor DropTargetMonitor object provided by React DND
 * @param dragItem The item being dragged
 * @param dropItem The target item (the one which the dragged item is being dropped on)
 * @param dropRef Reference to the drop target element
 * @param disabledDrop Whether the drop target is disabled
 * @returns DragCursorPosition
 *  - UpperHalf: If the item is dragged over the upper half of the target element
 *  - LowerHalf: If the item is dragged over the lower half of the target element
 *  - Outside: If the item is dragged outside of the droppable area of the target element (nested targets are not a part of the droppable area) or if disabledDrop is true
 *  - Self: If the dragged item is the same as the target item
 *  - Idle: If nothing relevant is being dragged
 */
export const getDragCursorPosition = <T>(
  monitor: DropTargetMonitor,
  dragItem: DndItem<T>,
  dropItem: ExistingDndItem,
  dropRef: RefObject<HTMLDivElement>,
  disabledDrop?: boolean,
): DragCursorPosition => {
  if (!monitor) return DragCursorPosition.Idle;

  if (dragItem.isNew === false && areObjectsEqual(dragItem.position, dropItem.position))
    return DragCursorPosition.Self;

  const clientOffset = monitor.getClientOffset();
  if (disabledDrop || !clientOffset || !monitor.isOver({ shallow: true }))
    return DragCursorPosition.Outside;

  const boundingClientRect = dropRef.current?.getBoundingClientRect();

  const hoverClientY = clientOffset.y - boundingClientRect.top; // Find distance from top of element
  if (hoverClientY < boundingClientRect.height / 2) {
    // Upper half
    return dragItem.isNew === false && isFirstItemRightAboveSecondItem(dragItem, dropItem)
      ? DragCursorPosition.Self // Return Self if the target element is the one right below the dragged element
      : DragCursorPosition.UpperHalf; // Return UpperHalf otherwise
  } else {
    // Lower half
    return dragItem.isNew === false && isFirstItemRightAboveSecondItem(dropItem, dragItem)
      ? DragCursorPosition.Self // Return Self if the target element is the one right above the dragged element
      : DragCursorPosition.LowerHalf; // Return LowerHalf otherwise
  }
};

/**
 * Calculates the dragged item's new index and parent ID when it is dropped.
 * @param dragItem The item being dragged
 * @param dropItem The target item (the one which the dragged item is being dropped on)
 * @param dragCursorPosition The current DragCursorPosition (given by getDragCursorPosition)
 * @returns ItemPosition New parent ID and index
 */
export const calculateNewPosition = <T>(
  dragItem: DndItem<T>,
  dropItem: ExistingDndItem,
  dragCursorPosition: DragCursorPosition,
): ItemPosition | undefined => {
  const {
    position: { index: dropItemIndex, parentId: dropItemParent },
  } = dropItem;
  if (
    [DragCursorPosition.Self, DragCursorPosition.Outside, DragCursorPosition.Idle].includes(
      dragCursorPosition,
    )
  )
    return undefined;
  const moveAfter = dragCursorPosition === DragCursorPosition.LowerHalf;
  const movingDownInSameParent =
    dragItem.isNew === false &&
    dragItem.position.parentId === dropItemParent &&
    dragItem.position.index < dropItemIndex;
  const index =
    dropItemIndex +
    +moveAfter - // Add 1 to new index if the desired position is after the target item
    +movingDownInSameParent; // Subtract 1 from new index if the item is moving down, because the indexes will be offset when the item is removed above
  const parentId = dropItemParent;
  return { index, parentId };
};

/**
 * Checks that two items have the same parent and that thi first one comes right before the second one.
 * @param firstItem
 * @param secondItem
 * @returns boolean True if the first item comes right before the second one, false otherwise.
 */
const isFirstItemRightAboveSecondItem = (
  firstItem: ExistingDndItem,
  secondItem: ExistingDndItem,
): boolean => {
  const {
    position: { index: firstItemIndex, parentId: firstItemParent },
  } = firstItem;
  const {
    position: { index: secondItemIndex, parentId: secondItemParent },
  } = secondItem;
  return firstItemParent === secondItemParent && firstItemIndex === secondItemIndex - 1;
};
