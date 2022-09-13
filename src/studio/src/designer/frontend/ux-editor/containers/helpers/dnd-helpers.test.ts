import {
  getContainerPosition,
  handleDrop,
  hoverIndexHelper,
  hoverShouldBeIgnored,
} from './dnd-helpers';
import { DropTargetMonitor, XYCoord } from 'react-dnd';
import {
  ContainerPos,
  EditorDndEvents,
  EditorDndItem,
  ItemType,
} from './dnd-types';
import { randomUUID } from 'crypto';

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

test('getContainerPosition returns correct positions', () => {
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
export const createMockMonitor = (
  isOver: boolean,
  itemType: ItemType,
): DropTargetMonitor => {
  const monitor: Partial<DropTargetMonitor> = {
    isOver(): boolean {
      return isOver;
    },
    getItemType(): string | null {
      return itemType;
    },
    getClientOffset(): XYCoord | null {
      return { x: 100, y: 200 };
    },
  };
  return monitor as DropTargetMonitor;
};
export const createMockedDndEvents = (): EditorDndEvents => ({
  moveItem: jest.fn(),
  moveItemToBottom: jest.fn(),
  moveItemToTop: jest.fn(),
  onDropItem: jest.fn(),
});
const createDummyData = (
  itemType: ItemType,
  isOver: boolean,
): [EditorDndItem, Partial<DropTargetMonitor>, () => void, () => void] => {
  const onDrop = jest.fn();

  const droppedItem: EditorDndItem = {
    id: randomUUID(),
    type: itemType,
    onDrop,
  };
  const monitor = createMockMonitor(isOver, droppedItem.type);

  const onDropItem = jest.fn();

  return [droppedItem, monitor, onDrop, onDropItem];
};

test('should handle that we are not over drop target', () => {
  const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(
    ItemType.Item,
    false,
  );
  handleDrop(droppedItem, monitor, onDropItem, randomUUID(), 3);
  expect(onDrop).not.toBeCalled();
  expect(onDropItem).not.toBeCalled();
});

test('should handle that dropped item is undefined', () => {
  const [, monitor, onDrop, onDropItem] = createDummyData(ItemType.Item, true);
  handleDrop(undefined, monitor, onDropItem, randomUUID(), 3);
  expect(onDrop).not.toBeCalled();
  expect(onDropItem).not.toBeCalled();
});

test('should handle that ' + ItemType.Item + ' gets dropped', () => {
  const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(
    ItemType.Item,
    true,
  );
  handleDrop(droppedItem, monitor, onDropItem, randomUUID(), 3);
  expect(onDrop).not.toBeCalled();
  expect(onDropItem).toBeCalled();
});
test('should handle that ' + ItemType.Container + ' gets dropped', () => {
  const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(
    ItemType.Container,
    true,
  );
  handleDrop(droppedItem, monitor, onDropItem, randomUUID(), 3);
  expect(onDrop).not.toBeCalled();
  expect(onDropItem).toBeCalled();
});

test('should handle that ' + ItemType.ToolbarItem + ' gets dropped', () => {
  const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(
    ItemType.ToolbarItem,
    true,
  );
  handleDrop(droppedItem, monitor, onDropItem, randomUUID(), 3);
  expect(onDrop).toBeCalled();
  expect(onDropItem).not.toBeCalled();
});

test('that hoverIndexHelper can be initiated', () => {
  const draggedItem = {
    id: randomUUID(),
    type: ItemType.Item,
    index: 0,
  };
  const hoveredItem = {
    id: randomUUID(),
    type: ItemType.Item,
    index: 1,
  };
  const clientOffset: XYCoord = { x: 500, y: 290 };
  expect(
    hoverIndexHelper(draggedItem, hoveredItem, boundingBox, clientOffset),
  ).toBeFalsy();
  expect(
    hoverIndexHelper(draggedItem, hoveredItem, undefined, clientOffset),
  ).toBeFalsy();
  expect(
    hoverIndexHelper(draggedItem, hoveredItem, boundingBox, undefined),
  ).toBeFalsy();
  expect(
    hoverIndexHelper(draggedItem, draggedItem, boundingBox, clientOffset),
  ).toBeFalsy();
});

const id = randomUUID();
test.each([
  [true, undefined, true],
  [false, undefined, true],
  [true, { id, type: ItemType.Item }, true],
  [true, { id, containerId: randomUUID(), type: ItemType.Item }, false],
])(
  'if hoverShouldBeIgnored when isOver is %p and item is %p',
  (isOver: boolean, item: EditorDndItem, result: boolean) => {
    const monitor = createMockMonitor(isOver, item?.type);
    expect(hoverShouldBeIgnored(monitor, item)).toBe(result);
  },
);
