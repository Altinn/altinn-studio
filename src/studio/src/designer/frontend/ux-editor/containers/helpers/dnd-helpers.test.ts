import { getContainerPosition, handleDrop } from './dnd-helpers';
import { DropTargetMonitor, XYCoord } from 'react-dnd';
import { ContainerPos, EditorDndItem, ItemType } from './dnd-types';
import { randomUUID } from 'crypto';

test('getContainerPosition returns correct positions', () => {
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

const createDummyData = (
  itemType: ItemType,
): [EditorDndItem, Partial<DropTargetMonitor>, () => void, () => void] => {
  const onDrop = jest.fn();

  const droppedItem: EditorDndItem = {
    id: randomUUID(),
    type: itemType,
    onDrop,
  };
  const monitor: Partial<DropTargetMonitor> = {
    isOver(): boolean {
      return true;
    },
    getItemType(): string | null {
      return droppedItem.type;
    },
  };
  const onDropItem = jest.fn();

  return [droppedItem, monitor, onDrop, onDropItem];
};

test('should handle that ' + ItemType.Item + ' gets dropped', () => {
  const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(
    ItemType.Item,
  );
  handleDrop(droppedItem, monitor, onDropItem, randomUUID(), 3);
  expect(onDrop).not.toBeCalled();
  expect(onDropItem).toBeCalled();
});
test('should handle that ' + ItemType.Container + ' gets dropped', () => {
  const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(
    ItemType.Container,
  );
  handleDrop(droppedItem, monitor, onDropItem, randomUUID(), 3);
  expect(onDrop).not.toBeCalled();
  expect(onDropItem).toBeCalled();
});

test('should handle that ' + ItemType.ToolbarItem + ' gets dropped', () => {
  const [droppedItem, monitor, onDrop, onDropItem] = createDummyData(
    ItemType.ToolbarItem,
  );
  handleDrop(droppedItem, monitor, onDropItem, randomUUID(), 3);
  expect(onDrop).toBeCalled();
  expect(onDropItem).not.toBeCalled();
});
