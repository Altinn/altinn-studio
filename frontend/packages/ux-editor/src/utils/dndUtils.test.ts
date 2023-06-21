import { calculateNewPosition, getDragCursorPosition, } from './dndUtils';
import type { ExistingDndItem, NewDndItem } from '../types/dndTypes';
import { DragCursorPosition } from '../types/dndTypes';
import { ComponentType } from 'app-shared/types/ComponentType';
import { DropTargetMonitor, XYCoord } from 'react-dnd';
import { RefObject } from 'react';

// Test data
const targetElementTop = 100;
const targetElementLeft = 100;
const targetElementWidth = 100;
const targetElementHeight = 100;
const targetElementRect: DOMRect = {
  x: targetElementTop,
  y: targetElementLeft,
  width: targetElementWidth,
  height: targetElementHeight,
  top: targetElementTop,
  left: targetElementLeft,
  right: targetElementTop + targetElementWidth,
  bottom: targetElementLeft + targetElementHeight,
  toJSON: jest.fn(),
};
const dropRef: RefObject<HTMLDivElement> = {
  current: {
    ...document.createElement('div'),
    getBoundingClientRect: () => targetElementRect,
  },
};
const xyCoord: XYCoord = {
  x: targetElementLeft + targetElementWidth / 2,
  y: targetElementTop + targetElementHeight / 2
};
const isOver = () => true;
const dropTargetMonitor: DropTargetMonitor = {
  canDrop: jest.fn(),
  didDrop: jest.fn(),
  getClientOffset: () => xyCoord,
  getDifferenceFromInitialOffset: jest.fn(),
  getDropResult: jest.fn(),
  getHandlerId: jest.fn(),
  getInitialClientOffset: jest.fn(),
  getInitialSourceClientOffset: jest.fn(),
  getItem: jest.fn(),
  getItemType: jest.fn(),
  getSourceClientOffset: jest.fn(),
  isOver,
  receiveHandlerId: jest.fn(),
  subscribeToStateChange: jest.fn(),
};
const parent1Id = 'parent1';
const parent2Id = 'parent2';
const dropItemIndex = 3;
const dropItem: ExistingDndItem = {
  isNew: false,
  id: 'id1',
  position: {
    index: dropItemIndex,
    parentId: parent1Id,
  }
};
const newDragItem: NewDndItem = {
  isNew: true,
  type: ComponentType.Paragraph,
};
const dragItemFromBelow: ExistingDndItem = {
  isNew: false,
  id: 'id2',
  position: {
    index: dropItemIndex + 2,
    parentId: parent1Id,
  }
};
const dragItemFromAbove: ExistingDndItem = {
  isNew: false,
  id: 'id3',
  position: {
    index: dropItemIndex - 2,
    parentId: parent1Id,
  }
};
const dragItemFromAnotherParent: ExistingDndItem = {
  isNew: false,
  id: 'id4',
  position: {
    index: 1,
    parentId: parent2Id,
  }
};

describe('dndUtils', () => {
  describe('getDragCursorPosition', () => {
    it('Returns Self if item is being dragged over itself', () => {
      expect(getDragCursorPosition(dropTargetMonitor, dropItem, dropItem, dropRef)).toEqual(DragCursorPosition.Self);
    });

    it('Returns Outside if item is being dragged outside of the drop target', () => {
      const monitor = {
        ...dropTargetMonitor,
        isOver: () => false,
      };
      expect(getDragCursorPosition(monitor, newDragItem, dropItem, dropRef)).toEqual(DragCursorPosition.Outside);
      expect(getDragCursorPosition(monitor, dragItemFromBelow, dropItem, dropRef)).toEqual(DragCursorPosition.Outside);
      expect(getDragCursorPosition(monitor, dragItemFromAbove, dropItem, dropRef)).toEqual(DragCursorPosition.Outside);
      expect(getDragCursorPosition(monitor, dragItemFromAnotherParent, dropItem, dropRef)).toEqual(DragCursorPosition.Outside);
    });

    it('Returns UpperHalf if item is being dragged over the upper half of the drop target', () => {
      const monitor = {
        ...dropTargetMonitor,
        getClientOffset: () => ({ x: xyCoord.x, y: xyCoord.y - 1 }),
      };
      expect(getDragCursorPosition(monitor, newDragItem, dropItem, dropRef)).toEqual(DragCursorPosition.UpperHalf);
      expect(getDragCursorPosition(monitor, dragItemFromBelow, dropItem, dropRef)).toEqual(DragCursorPosition.UpperHalf);
      expect(getDragCursorPosition(monitor, dragItemFromAbove, dropItem, dropRef)).toEqual(DragCursorPosition.UpperHalf);
      expect(getDragCursorPosition(monitor, dragItemFromAnotherParent, dropItem, dropRef)).toEqual(DragCursorPosition.UpperHalf);
    });

    it('Returns LowerHalf if item is being dragged over the lower half of the drop target', () => {
      const monitor = {
        ...dropTargetMonitor,
        getClientOffset: () => ({ x: xyCoord.x, y: xyCoord.y + 1 }),
      };
      expect(getDragCursorPosition(monitor, newDragItem, dropItem, dropRef)).toEqual(DragCursorPosition.LowerHalf);
      expect(getDragCursorPosition(monitor, dragItemFromBelow, dropItem, dropRef)).toEqual(DragCursorPosition.LowerHalf);
      expect(getDragCursorPosition(monitor, dragItemFromAbove, dropItem, dropRef)).toEqual(DragCursorPosition.LowerHalf);
      expect(getDragCursorPosition(monitor, dragItemFromAnotherParent, dropItem, dropRef)).toEqual(DragCursorPosition.LowerHalf);
    });

    it('Returns Self if item is being dragged over the lower half of the item above', () => {
      const monitor = {
        ...dropTargetMonitor,
        getClientOffset: () => ({ x: xyCoord.x, y: xyCoord.y + 1 }),
      };
      const dragItemFromRightBelow: ExistingDndItem = {
        isNew: false,
        id: 'id5',
        position: {
          index: dropItemIndex + 1,
          parentId: dropItem.position.parentId,
        }
      };
      expect(getDragCursorPosition(monitor, dragItemFromRightBelow, dropItem, dropRef)).toEqual(DragCursorPosition.Self);
    });

    it('Returns Self if item is being dragged over the upper half of the item below', () => {
      const monitor = {
        ...dropTargetMonitor,
        getClientOffset: () => ({ x: xyCoord.x, y: xyCoord.y - 1 }),
      };
      const dragItemFromRightAbove: ExistingDndItem = {
        isNew: false,
        id: 'id5',
        position: {
          index: dropItemIndex - 1,
          parentId: dropItem.position.parentId,
        }
      };
      expect(getDragCursorPosition(monitor, dragItemFromRightAbove, dropItem, dropRef)).toEqual(DragCursorPosition.Self);
    });

    it('Returns Outside if disabledDrop is true', () => {
      expect(getDragCursorPosition(dropTargetMonitor, newDragItem, dropItem, dropRef, true)).toEqual(DragCursorPosition.Outside);
      expect(getDragCursorPosition(dropTargetMonitor, dragItemFromBelow, dropItem, dropRef, true)).toEqual(DragCursorPosition.Outside);
      expect(getDragCursorPosition(dropTargetMonitor, dragItemFromAbove, dropItem, dropRef, true)).toEqual(DragCursorPosition.Outside);
      expect(getDragCursorPosition(dropTargetMonitor, dragItemFromAnotherParent, dropItem, dropRef, true)).toEqual(DragCursorPosition.Outside);
    });

    it('Returns Idle if monitor is null', () => {
      expect(getDragCursorPosition(null, newDragItem, dropItem, dropRef)).toEqual(DragCursorPosition.Idle);
    });
  });

  describe('calculateNewPosition', () => {
    it.each([
      DragCursorPosition.Self,
      DragCursorPosition.Outside,
      DragCursorPosition.Idle
    ])('Returns undefined if dragCursorPosition is %s', (dragCursorPosition) => {
      expect(calculateNewPosition(newDragItem, dropItem, dragCursorPosition)).toBeUndefined();
      expect(calculateNewPosition(dragItemFromAbove, dropItem, dragCursorPosition)).toBeUndefined();
      expect(calculateNewPosition(dragItemFromBelow, dropItem, dragCursorPosition)).toBeUndefined();
      expect(calculateNewPosition(dragItemFromAnotherParent, dropItem, dragCursorPosition)).toBeUndefined();
    });

    it('Returns index of drop item if dragCursorPosition is UpperHalf and the dragged item is new', () => {
      expect(calculateNewPosition(newDragItem, dropItem, DragCursorPosition.UpperHalf).index).toEqual(dropItemIndex);
    });

    it('Returns index of drop item + 1 if dragCursorPosition is LowerHalf and the dragged item is new', () => {
      expect(calculateNewPosition(newDragItem, dropItem, DragCursorPosition.LowerHalf).index).toEqual(dropItemIndex + 1);
    });

    it('Returns index of drop item if dragCursorPosition is UpperHalf and the dragged item comes from below', () => {
      expect(calculateNewPosition(dragItemFromBelow, dropItem, DragCursorPosition.UpperHalf).index).toEqual(dropItemIndex);
    });

    it('Returns index of drop item + 1 if dragCursorPosition is LowerHalf and the dragged item comes from below', () => {
      expect(calculateNewPosition(dragItemFromBelow, dropItem, DragCursorPosition.LowerHalf).index).toEqual(dropItemIndex + 1);
    });

    it('Returns index of drop item - 1 if dragCursorPosition is UpperHalf and the dragged item comes from above', () => {
      expect(calculateNewPosition(dragItemFromAbove, dropItem, DragCursorPosition.UpperHalf).index).toEqual(dropItemIndex - 1);
    });

    it('Returns index of drop item if dragCursorPosition is LowerHalf and the dragged item comes from above', () => {
      expect(calculateNewPosition(dragItemFromAbove, dropItem, DragCursorPosition.LowerHalf).index).toEqual(dropItemIndex);
    });

    it('Returns index of drop item if dragCursorPosition is UpperHalf and the dragged item comes from another parent', () => {
      expect(calculateNewPosition(dragItemFromAnotherParent, dropItem, DragCursorPosition.UpperHalf).index).toEqual(dropItemIndex);
    });

    it('Returns index of drop item + 1 if dragCursorPosition is LowerHalf and the dragged item comes from another parent', () => {
      expect(calculateNewPosition(dragItemFromAnotherParent, dropItem, DragCursorPosition.LowerHalf).index).toEqual(dropItemIndex + 1);
    });

    it.each([
      DragCursorPosition.UpperHalf,
      DragCursorPosition.LowerHalf
    ])('Returns parent ID of drop item when dragCursorPosition is %s', (dragCursorPosition) => {
      expect(calculateNewPosition(newDragItem, dropItem, dragCursorPosition).parentId).toEqual(parent1Id);
      expect(calculateNewPosition(dragItemFromBelow, dropItem, dragCursorPosition).parentId).toEqual(parent1Id);
      expect(calculateNewPosition(dragItemFromAbove, dropItem, dragCursorPosition).parentId).toEqual(parent1Id);
      expect(calculateNewPosition(dragItemFromAnotherParent, dropItem, dragCursorPosition).parentId).toEqual(parent1Id);
    });
  });
});
