import { EditorDndEvents, ItemType } from '../types/dndTypes';
import { DropTargetMonitor } from 'react-dnd';

export const createMockedDndEvents = (): EditorDndEvents => ({
  moveItem: jest.fn(),
  moveItemToBottom: jest.fn(),
  moveItemToTop: jest.fn(),
  onDropItem: jest.fn(),
});

export const createMockMonitor = (isOver: boolean, itemType: ItemType): DropTargetMonitor => {
  const monitor: Partial<DropTargetMonitor> = {
    isOver: () => isOver,
    getItemType: () => itemType,
    getClientOffset: () => ({ x: 100, y: 200 }),
  };
  return monitor as DropTargetMonitor;
};
