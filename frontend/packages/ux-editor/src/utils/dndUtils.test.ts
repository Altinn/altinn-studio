import {
  getContainerPosition,
  handleDrop,
  hoverIndexHelper,
  hoverShouldBeIgnored,
} from './dndUtils';
import type { DropTargetMonitor, XYCoord } from 'react-dnd';
import type { EditorDndItem } from '../types/dndTypes';
import { ContainerPos, ItemType } from '../types/dndTypes';
import { createMockMonitor } from '../testing/dndMocks';

// Test data
const boundingBox: DOMRect = {
  bottom: 406.6875,
  height: 111.921875,
  left: 353,
  right: 1085,
  top: 294.765625,
  width: 732,
  x: 353,
  y: 294.765625,
  toJSON: () => '',
};
const createDummyData = (
  itemType: ItemType,
  isOver: boolean,
  id: string
): [EditorDndItem, Partial<DropTargetMonitor>, () => void, () => void] => {
  const onDrop = jest.fn();
  const droppedItem: EditorDndItem = {
    id,
    type: itemType,
    onDrop,
  };
  const monitor = createMockMonitor(isOver, droppedItem.type);
  const onDropItem = jest.fn();
  return [droppedItem, monitor, onDrop, onDropItem];
};

describe('dndUtils', () => {

  describe('getContainerPosition', () => {
    it('returns correct positions', () => {
      const scenarios: [number, string][] = [
        [300, ContainerPos.Top],
        [290, undefined],
        [400, ContainerPos.Bottom],
        [500, undefined],
      ];
      scenarios.forEach((scenario) => {
        const [y, expected] = scenario;
        const xyCord: XYCoord = { x: 500, y };
        const result = getContainerPosition(boundingBox, xyCord);
        expect(result).toBe(expected);
      });
    });
  });

  describe('handleDrop', () => {

    it('should handle that we are not over drop target', () => {
      const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(ItemType.Item, false, '390fa74c-6318-47bd-b609-1bf59a83fb95');
      handleDrop(droppedItem, monitor, onDropItem, '0a7949d6-138f-479f-b529-10ddb0b13536', 3);
      expect(onDrop).not.toBeCalled();
      expect(onDropItem).not.toBeCalled();
    });

    it('should handle that dropped item is undefined', () => {
      const [, monitor, onDrop, onDropItem] = createDummyData(ItemType.Item, true, '268b60ad-7b15-4869-9c77-260165e7830c');
      handleDrop(undefined, monitor, onDropItem, '1659c65b-7232-4632-853c-62792281948d', 3);
      expect(onDrop).not.toBeCalled();
      expect(onDropItem).not.toBeCalled();
    });

    it.each([
      ItemType.Item,
      ItemType.Container,
    ])(`Handles that %s gets dropped`, (itemType) => {
      const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(itemType, true, '0c5a8d3d-4cf2-49bb-97f0-b5db753478d4');
      handleDrop(droppedItem, monitor, onDropItem, 'c32fecd7-8641-4577-9765-bf14e3f45281', 3);
      expect(onDrop).not.toBeCalled();
      expect(onDropItem).toBeCalled();
    });
  });

  it(`should handle that ${ItemType.ToolbarItem} gets dropped`, () => {
    const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(ItemType.ToolbarItem, true, '0c5a8d3d-4cf2-49bb-97f0-b5db753478d4');
    handleDrop(droppedItem, monitor, onDropItem, 'c32fecd7-8641-4577-9765-bf14e3f45281', 3);
    expect(onDrop).toBeCalled();
    expect(onDropItem).not.toBeCalled();
  });

  describe('hoverIndexHelper', () => {
    it('Can be initiated', () => {
      const draggedItem = {
        id: '7dbf1a30-eae7-45af-8803-96f2b6481f59',
        type: ItemType.Item,
        index: 0,
      };
      const hoveredItem = {
        id: '3216e44c-414c-426a-ad44-5da7f655fe16',
        type: ItemType.Item,
        index: 1,
      };
      const clientOffset: XYCoord = { x: 500, y: 290 };
      expect(hoverIndexHelper(draggedItem, hoveredItem, boundingBox, clientOffset)).toBeFalsy();
      expect(hoverIndexHelper(draggedItem, hoveredItem, undefined, clientOffset)).toBeFalsy();
      expect(hoverIndexHelper(draggedItem, hoveredItem, boundingBox, undefined)).toBeFalsy();
      expect(hoverIndexHelper(draggedItem, draggedItem, boundingBox, clientOffset)).toBeFalsy();
    });
  });

  describe('hoverShouldBeIgnored', () => {
    const id = '9405c611-c19a-4a6b-b4c9-f5462bf51338';
    test.each([
      [true, undefined, true],
      [false, undefined, true],
      [true, { id, type: ItemType.Item }, true],
      [true, { id, containerId: '0942c4d3-9e4d-4de5-ab7a-2e4f3a0792ad', type: ItemType.Item }, false],
    ])(
      'When isOver is %p and item is %p, it returns %s',
      (isOver: boolean, item: EditorDndItem, expectedResult: boolean) => {
        const monitor = createMockMonitor(isOver, item?.type);
        expect(hoverShouldBeIgnored(monitor, item)).toBe(expectedResult);
      }
    );
  });
});
