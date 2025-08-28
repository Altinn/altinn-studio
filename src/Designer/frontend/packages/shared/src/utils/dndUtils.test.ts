import { calculateNewPosition, getDragCursorPosition } from './dndUtils';
import type { ExistingDndItem, NewDndItem } from 'app-shared/types/dndTypes';
import { DragCursorPosition } from 'app-shared/types/dndTypes';
import type { DropTargetMonitor, XYCoord } from 'react-dnd';
import type { RefObject } from 'react';

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
  y: targetElementTop + targetElementHeight / 2,
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
  },
};
const newDragItem: NewDndItem<string> = {
  isNew: true,
  payload: 'test',
};
const dragItemFromBelow: ExistingDndItem = {
  isNew: false,
  id: 'id2',
  position: {
    index: dropItemIndex + 2,
    parentId: parent1Id,
  },
};
const dragItemFromAbove: ExistingDndItem = {
  isNew: false,
  id: 'id3',
  position: {
    index: dropItemIndex - 2,
    parentId: parent1Id,
  },
};
const dragItemFromAnotherParent: ExistingDndItem = {
  isNew: false,
  id: 'id4',
  position: {
    index: 1,
    parentId: parent2Id,
  },
};

describe('dndUtils', () => {
  describe('getDragCursorPosition', () => {
    it('Returns Self if item is being dragged over itself', () => {
      const result = getDragCursorPosition(dropTargetMonitor, dropItem, dropItem, dropRef);
      expect(result).toEqual(DragCursorPosition.Self);
    });

    it('Returns Outside if item is being dragged outside of the drop target', () => {
      const monitor = {
        ...dropTargetMonitor,
        isOver: () => false,
      };

      const result1 = getDragCursorPosition(monitor, newDragItem, dropItem, dropRef);
      expect(result1).toEqual(DragCursorPosition.Outside);

      const result2 = getDragCursorPosition(monitor, dragItemFromBelow, dropItem, dropRef);
      expect(result2).toEqual(DragCursorPosition.Outside);

      const result3 = getDragCursorPosition(monitor, dragItemFromAbove, dropItem, dropRef);
      expect(result3).toEqual(DragCursorPosition.Outside);

      const result4 = getDragCursorPosition(monitor, dragItemFromAnotherParent, dropItem, dropRef);
      expect(result4).toEqual(DragCursorPosition.Outside);
    });

    it('Returns UpperHalf if item is being dragged over the upper half of the drop target', () => {
      const monitor = {
        ...dropTargetMonitor,
        getClientOffset: () => ({ x: xyCoord.x, y: xyCoord.y - 1 }),
      };

      const result1 = getDragCursorPosition(monitor, newDragItem, dropItem, dropRef);
      expect(result1).toEqual(DragCursorPosition.UpperHalf);

      const result2 = getDragCursorPosition(monitor, dragItemFromBelow, dropItem, dropRef);
      expect(result2).toEqual(DragCursorPosition.UpperHalf);

      const result3 = getDragCursorPosition(monitor, dragItemFromAbove, dropItem, dropRef);
      expect(result3).toEqual(DragCursorPosition.UpperHalf);

      const result4 = getDragCursorPosition(monitor, dragItemFromAnotherParent, dropItem, dropRef);
      expect(result4).toEqual(DragCursorPosition.UpperHalf);
    });

    it('Returns LowerHalf if item is being dragged over the lower half of the drop target', () => {
      const monitor = {
        ...dropTargetMonitor,
        getClientOffset: () => ({ x: xyCoord.x, y: xyCoord.y + 1 }),
      };

      const result1 = getDragCursorPosition(monitor, newDragItem, dropItem, dropRef);
      expect(result1).toEqual(DragCursorPosition.LowerHalf);

      const result2 = getDragCursorPosition(monitor, dragItemFromBelow, dropItem, dropRef);
      expect(result2).toEqual(DragCursorPosition.LowerHalf);

      const result3 = getDragCursorPosition(monitor, dragItemFromAbove, dropItem, dropRef);
      expect(result3).toEqual(DragCursorPosition.LowerHalf);

      const result4 = getDragCursorPosition(monitor, dragItemFromAnotherParent, dropItem, dropRef);
      expect(result4).toEqual(DragCursorPosition.LowerHalf);
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
        },
      };
      expect(getDragCursorPosition(monitor, dragItemFromRightBelow, dropItem, dropRef)).toEqual(
        DragCursorPosition.Self,
      );
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
        },
      };
      expect(getDragCursorPosition(monitor, dragItemFromRightAbove, dropItem, dropRef)).toEqual(
        DragCursorPosition.Self,
      );
    });

    it('Returns Outside if disabledDrop is true', () => {
      expect(
        getDragCursorPosition(dropTargetMonitor, newDragItem, dropItem, dropRef, true),
      ).toEqual(DragCursorPosition.Outside);
      expect(
        getDragCursorPosition(dropTargetMonitor, dragItemFromBelow, dropItem, dropRef, true),
      ).toEqual(DragCursorPosition.Outside);
      expect(
        getDragCursorPosition(dropTargetMonitor, dragItemFromAbove, dropItem, dropRef, true),
      ).toEqual(DragCursorPosition.Outside);
      expect(
        getDragCursorPosition(
          dropTargetMonitor,
          dragItemFromAnotherParent,
          dropItem,
          dropRef,
          true,
        ),
      ).toEqual(DragCursorPosition.Outside);
    });

    it('Returns Idle if monitor is null', () => {
      expect(getDragCursorPosition(null, newDragItem, dropItem, dropRef)).toEqual(
        DragCursorPosition.Idle,
      );
    });
  });

  describe('calculateNewPosition', () => {
    it.each([DragCursorPosition.Self, DragCursorPosition.Outside, DragCursorPosition.Idle])(
      'Returns undefined if dragCursorPosition is %s',
      (dragCursorPosition) => {
        const res1 = calculateNewPosition(newDragItem, dropItem, dragCursorPosition);
        expect(res1).toBeUndefined();

        const res2 = calculateNewPosition(dragItemFromAbove, dropItem, dragCursorPosition);
        expect(res2).toBeUndefined();

        const res3 = calculateNewPosition(dragItemFromBelow, dropItem, dragCursorPosition);
        expect(res3).toBeUndefined();

        const res4 = calculateNewPosition(dragItemFromAnotherParent, dropItem, dragCursorPosition);
        expect(res4).toBeUndefined();
      },
    );

    it('Returns index of drop item if dragCursorPosition is UpperHalf and the dragged item is new', () => {
      const res = calculateNewPosition(newDragItem, dropItem, DragCursorPosition.UpperHalf);
      expect(res.index).toEqual(dropItemIndex);
    });

    it('Returns index of drop item + 1 if dragCursorPosition is LowerHalf and the dragged item is new', () => {
      const res = calculateNewPosition(newDragItem, dropItem, DragCursorPosition.LowerHalf);
      expect(res.index).toEqual(dropItemIndex + 1);
    });

    it('Returns index of drop item if dragCursorPosition is UpperHalf and the dragged item comes from below', () => {
      const res = calculateNewPosition(dragItemFromBelow, dropItem, DragCursorPosition.UpperHalf);
      expect(res.index).toEqual(dropItemIndex);
    });

    it('Returns index of drop item + 1 if dragCursorPosition is LowerHalf and the dragged item comes from below', () => {
      const res = calculateNewPosition(dragItemFromBelow, dropItem, DragCursorPosition.LowerHalf);
      expect(res.index).toEqual(dropItemIndex + 1);
    });

    it('Returns index of drop item - 1 if dragCursorPosition is UpperHalf and the dragged item comes from above', () => {
      const res = calculateNewPosition(dragItemFromAbove, dropItem, DragCursorPosition.UpperHalf);
      expect(res.index).toEqual(dropItemIndex - 1);
    });

    it('Returns index of drop item if dragCursorPosition is LowerHalf and the dragged item comes from above', () => {
      const res = calculateNewPosition(dragItemFromAbove, dropItem, DragCursorPosition.LowerHalf);
      expect(res.index).toEqual(dropItemIndex);
    });

    it('Returns index of drop item if dragCursorPosition is UpperHalf and the dragged item comes from another parent', () => {
      const res = calculateNewPosition(
        dragItemFromAnotherParent,
        dropItem,
        DragCursorPosition.UpperHalf,
      );
      expect(res.index).toEqual(dropItemIndex);
    });

    it('Returns index of drop item + 1 if dragCursorPosition is LowerHalf and the dragged item comes from another parent', () => {
      const res = calculateNewPosition(
        dragItemFromAnotherParent,
        dropItem,
        DragCursorPosition.LowerHalf,
      );
      expect(res.index).toEqual(dropItemIndex + 1);
    });

    it.each([DragCursorPosition.UpperHalf, DragCursorPosition.LowerHalf])(
      'Returns parent ID of drop item when dragCursorPosition is %s',
      (dragCursorPosition) => {
        const result1 = calculateNewPosition(newDragItem, dropItem, dragCursorPosition);
        expect(result1.parentId).toEqual(parent1Id);

        const result2 = calculateNewPosition(dragItemFromBelow, dropItem, dragCursorPosition);
        expect(result2.parentId).toEqual(parent1Id);

        const result3 = calculateNewPosition(dragItemFromAbove, dropItem, dragCursorPosition);
        expect(result3.parentId).toEqual(parent1Id);

        const result4 = calculateNewPosition(
          dragItemFromAnotherParent,
          dropItem,
          dragCursorPosition,
        );
        expect(result4.parentId).toEqual(parent1Id);
      },
    );
  });
});
